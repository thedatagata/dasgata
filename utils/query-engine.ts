// utils/query-engine.ts
/**
 * Modular Query Engine
 * 
 * This service provides a unified interface for query generation and execution.
 * It's designed to be easily wrapped with feature flags later.
 * 
 * Architecture:
 * - Provider interface allows swapping between WebLLM, MotherDuck AI, etc.
 * - Execution strategy allows switching between in-memory and cloud
 * - All decisions are externalized to config, making feature flag integration simple
 */

import type { TableMetadata } from "./webllm.ts";
import { webLLMEngine } from "./webllm.ts";
import type { MotherDuckClient } from "./motherduck-client.ts";

/**
 * Query generation providers
 */
export type QueryProvider = 'webllm' | 'motherduck-ai';

/**
 * Query execution targets
 */
export type QueryTarget = 'memory' | 'motherduck';

/**
 * Query generation result
 */
export interface GeneratedQuery {
  sql: string;
  provider: QueryProvider;
  explanation?: string;
  timestamp: number;
}

/**
 * Query execution result
 */
export interface ExecutionResult {
  data: any;
  executionTimeMs: number;
  target: QueryTarget;
  rowCount: number;
  fromCache?: boolean;
}

/**
 * Complete query result combining generation and execution
 */
export interface QueryResult {
  generated: GeneratedQuery;
  executed: ExecutionResult;
  naturalLanguageQuery: string;
  tableName: string;
}

/**
 * Query engine configuration
 * These values would be populated from feature flags in production
 */
export interface QueryEngineConfig {
  preferredProvider: QueryProvider;
  preferredTarget: QueryTarget;
  enableWebLLM: boolean;
  enableMaterialization: boolean;
  enableMetadataEnrichment: boolean;
  fallbackToMotherDuck: boolean;
}

/**
 * Modular Query Engine
 * 
 * Design principles:
 * 1. All providers implement the same interface
 * 2. Execution strategy is determined by target selection
 * 3. Configuration drives behavior (perfect for feature flags)
 * 4. Fallback logic is explicit and controllable
 */
export class QueryEngine {
  private config: QueryEngineConfig;
  private duckdbClient: any; // DuckDB-WASM client
  private motherDuckClient: MotherDuckClient | null;

  constructor(
    config: QueryEngineConfig,
    duckdbClient: any,
    motherDuckClient: MotherDuckClient | null = null
  ) {
    this.config = config;
    this.duckdbClient = duckdbClient;
    this.motherDuckClient = motherDuckClient;
  }

  /**
   * Update configuration (useful for runtime flag changes)
   */
  updateConfig(newConfig: Partial<QueryEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate SQL from natural language
   * 
   * This method encapsulates provider selection logic, making it easy
   * to add feature flag checks here later
   */
  async generateSQL(
    naturalLanguageQuery: string,
    tableName: string,
    metadata: TableMetadata | null
  ): Promise<GeneratedQuery> {
    const startTime = Date.now();
    
    try {
      // Try preferred provider first
      if (this.config.preferredProvider === 'webllm' && this.config.enableWebLLM) {
        return await this._generateWithWebLLM(naturalLanguageQuery, metadata);
      } else {
        return await this._generateWithMotherDuckAI(naturalLanguageQuery, tableName, metadata);
      }
    } catch (error) {
      // Fallback logic
      if (this.config.fallbackToMotherDuck && this.config.preferredProvider === 'webllm') {
        console.warn('WebLLM failed, falling back to MotherDuck AI:', error);
        return await this._generateWithMotherDuckAI(naturalLanguageQuery, tableName, metadata);
      }
      throw error;
    }
  }

  /**
   * Execute generated SQL
   * 
   * Target selection logic is centralized here, making it easy to add
   * feature flag checks later
   */
  async executeSQL(
    sql: string,
    tableName: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // Determine target based on configuration
    const target = this._selectExecutionTarget(tableName);
    
    try {
      if (target === 'memory') {
        return await this._executeInMemory(sql, startTime);
      } else {
        return await this._executeInMotherDuck(sql, startTime);
      }
    } catch (error) {
      console.error(`Execution failed on ${target}:`, error);
      throw error;
    }
  }

  /**
   * Full query pipeline: generate + execute
   */
  async query(
    naturalLanguageQuery: string,
    tableName: string,
    metadata: TableMetadata | null
  ): Promise<QueryResult> {
    // Generate SQL
    const generated = await this.generateSQL(naturalLanguageQuery, tableName, metadata);
    
    // Execute SQL
    const executed = await this.executeSQL(generated.sql, tableName);
    
    return {
      generated,
      executed,
      naturalLanguageQuery,
      tableName
    };
  }

  /**
   * Private: Generate SQL using WebLLM
   */
  private async _generateWithWebLLM(
    naturalLanguageQuery: string,
    metadata: TableMetadata | null
  ): Promise<GeneratedQuery> {
    if (!metadata) {
      throw new Error('Metadata required for WebLLM');
    }

    const response = await webLLMEngine.generateSQL(naturalLanguageQuery, [metadata]);
    
    // Extract SQL from markdown code block
    const sqlMatch = response.match(/```sql\n([\s\S]+?)\n```/);
    if (!sqlMatch) {
      throw new Error('WebLLM did not return valid SQL');
    }

    // Extract explanation
    const explanation = response.split('```')[2]?.trim() || undefined;

    return {
      sql: sqlMatch[1].trim(),
      provider: 'webllm',
      explanation,
      timestamp: Date.now()
    };
  }

  /**
   * Private: Generate SQL using MotherDuck AI
   */
  private async _generateWithMotherDuckAI(
    naturalLanguageQuery: string,
    tableName: string,
    metadata: TableMetadata | null
  ): Promise<GeneratedQuery> {
    if (!this.motherDuckClient) {
      throw new Error('MotherDuck client not configured');
    }

    // Build context-aware prompt
    let contextPrompt = naturalLanguageQuery;
    if (metadata && this.config.enableMetadataEnrichment) {
      const columnList = metadata.columns
        .map(c => `${c.name} (${c.type})${c.description ? `: ${c.description}` : ''}`)
        .join(', ');
      contextPrompt = `Given table ${tableName} with columns: ${columnList}\n\nQuery: ${naturalLanguageQuery}`;
    }

    // Use MotherDuck's prompt_sql function
    const generateQuery = `CALL prompt_sql('${contextPrompt.replace(/'/g, "''")}', include_tables=['${tableName}']);`;
    
    const sqlResult = await this.motherDuckClient.evaluateQuery(generateQuery);
    const sqlRows = sqlResult.data.toRows();
    
    if (!sqlRows[0]?.query) {
      throw new Error('MotherDuck AI did not generate SQL');
    }

    return {
      sql: sqlRows[0].query,
      provider: 'motherduck-ai',
      timestamp: Date.now()
    };
  }

  /**
   * Private: Select execution target based on table and config
   */
  private _selectExecutionTarget(tableName: string): QueryTarget {
    // This is where we'd check if table is materialized
    // For now, use config preference
    if (this.config.preferredTarget === 'memory' && this.config.enableMaterialization) {
      return 'memory';
    }
    return 'motherduck';
  }

  /**
   * Private: Execute in DuckDB-WASM (browser memory)
   */
  private async _executeInMemory(sql: string, startTime: number): Promise<ExecutionResult> {
    const result = await this.duckdbClient.evaluateQuery(sql);
    const rows = result.data.toRows();
    
    return {
      data: rows,
      executionTimeMs: Date.now() - startTime,
      target: 'memory',
      rowCount: rows.length
    };
  }

  /**
   * Private: Execute in MotherDuck cloud
   */
  private async _executeInMotherDuck(sql: string, startTime: number): Promise<ExecutionResult> {
    if (!this.motherDuckClient) {
      throw new Error('MotherDuck client not configured');
    }

    const result = await this.motherDuckClient.evaluateQuery(sql);
    const rows = result.data.toRows();
    
    return {
      data: rows,
      executionTimeMs: Date.now() - startTime,
      target: 'motherduck',
      rowCount: rows.length
    };
  }
}

/**
 * Helper: Create default configuration
 * This would be populated from feature flags in production
 */
export function createDefaultConfig(): QueryEngineConfig {
  return {
    preferredProvider: 'webllm',
    preferredTarget: 'memory',
    enableWebLLM: true,
    enableMaterialization: true,
    enableMetadataEnrichment: true,
    fallbackToMotherDuck: true
  };
}
