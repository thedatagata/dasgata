// utils/modular-query-service.ts
/**
 * Modular Query Service with Feature Flag Integration
 * 
 * This service orchestrates:
 * - Query generation (WebLLM vs MotherDuck AI)
 * - Query execution (memory vs MotherDuck)
 * - Semantic caching and similarity search
 * - Query approval workflow
 * 
 * Everything controlled by LaunchDarkly feature flags
 */

import { SemanticCache, type CachedQuery, type TableMetadata } from "../lib/semantic-cache.ts";
import { webLLMEngine } from "./webllm.ts";
import type { MotherDuckClient } from "./motherduck-client.ts";

export interface QueryConfig {
  // Feature flags
  enableWebLLM: boolean;
  enableMaterialization: boolean;
  enableSemanticCache: boolean;
  enableQueryApproval: boolean;
  
  // Preferences
  preferWebLLM: boolean;
  preferMemoryExecution: boolean;
  
  // Cache settings
  cacheThreshold: number;
  autoApproveThreshold: number;
}

export interface QueryRequest {
  prompt: string;
  tableName: string;
  metadata?: TableMetadata;
}

export interface QueryResponse {
  // Query details
  sql: string;
  provider: 'webllm' | 'motherduck';
  executionTarget: 'memory' | 'motherduck';
  
  // Results
  data: any[];
  rowCount: number;
  executionTimeMs: number;
  
  // Cache info
  fromCache: boolean;
  cacheId?: string;
  similarity?: number;
  
  // Approval status
  approved: boolean;
}

export class ModularQueryService {
  private cache: SemanticCache;
  private config: QueryConfig;
  private duckdbClient: any;
  private motherDuckClient: MotherDuckClient | null;

  constructor(
    config: QueryConfig,
    duckdbClient: any,
    motherDuckClient: MotherDuckClient | null = null
  ) {
    this.config = config;
    this.duckdbClient = duckdbClient;
    this.motherDuckClient = motherDuckClient;
  }

  static async create(
    config: QueryConfig,
    duckdbClient: any,
    motherDuckClient: MotherDuckClient | null = null
  ): Promise<ModularQueryService> {
    const instance = new ModularQueryService(config, duckdbClient, motherDuckClient);
    instance.cache = await SemanticCache.create();
    return instance;
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    // Step 1: Check semantic cache if enabled
    if (this.config.enableSemanticCache) {
      const cached = await this.checkCache(request);
      if (cached) {
        return cached;
      }
    }

    // Step 2: Generate SQL
    const { sql, provider } = await this.generateSQL(request);
    
    // Step 3: Execute SQL
    const { data, rowCount, target } = await this.executeSQL(sql, request.tableName);
    
    // Step 4: Cache result if enabled
    let cacheId: string | undefined;
    if (this.config.enableSemanticCache) {
      cacheId = await this.cache.cacheQuery(
        request.prompt,
        sql,
        data,
        [request.tableName],
        provider === 'webllm' ? 'webllm' : 'motherduck',
        false // Not auto-approved yet
      );
    }

    const response: QueryResponse = {
      sql,
      provider,
      executionTarget: target,
      data,
      rowCount,
      executionTimeMs: Date.now() - startTime,
      fromCache: false,
      cacheId,
      approved: false
    };

    return response;
  }

  async approveQuery(cacheId: string): Promise<void> {
    if (!this.config.enableQueryApproval) {
      throw new Error('Query approval feature is disabled');
    }
    
    await this.cache.approveQuery(cacheId);
  }

  async getApprovedQueries(limit: number = 10): Promise<CachedQuery[]> {
    return await this.cache.getApprovedQueries(limit);
  }

  async buildQueryContext(): Promise<string> {
    if (!this.config.enableQueryApproval) {
      return '';
    }
    return await this.cache.buildQueryContext();
  }

  private async checkCache(request: QueryRequest): Promise<QueryResponse | null> {
    const queryMode = this.config.preferWebLLM ? 'webllm' : 'motherduck';
    const cached = await this.cache.findSimilar(
      request.prompt,
      this.config.cacheThreshold,
      queryMode
    );

    if (!cached) return null;

    // Calculate similarity score
    const similarity = cached.embedding ? 0.9 : 0.7; // Simplified

    console.log(`🎯 Using cached query (${(similarity * 100).toFixed(0)}% match)`);

    return {
      sql: cached.query,
      provider: cached.queryMode,
      executionTarget: cached.queryMode === 'webllm' ? 'memory' : 'motherduck',
      data: cached.results,
      rowCount: cached.results.length,
      executionTimeMs: 0,
      fromCache: true,
      cacheId: cached.id,
      similarity,
      approved: cached.approved
    };
  }

  private async generateSQL(request: QueryRequest): Promise<{ sql: string, provider: 'webllm' | 'motherduck' }> {
    // Determine provider based on flags
    if (this.config.enableWebLLM && this.config.preferWebLLM && request.metadata) {
      try {
        const context = await this.buildQueryContext();
        const response = await webLLMEngine.generateSQL(
          request.prompt + (context ? `\n\n${context}` : ''),
          [request.metadata]
        );
        
        const sqlMatch = response.match(/```sql\n([\s\S]+?)\n```/);
        if (sqlMatch) {
          return { sql: sqlMatch[1].trim(), provider: 'webllm' };
        }
      } catch (error) {
        console.warn('WebLLM generation failed:', error);
      }
    }

    // Fallback to MotherDuck
    if (!this.motherDuckClient) {
      throw new Error('MotherDuck client not configured');
    }

    const generateQuery = `CALL prompt_sql('${request.prompt.replace(/'/g, "''")}', include_tables=['${request.tableName}']);`;
    const result = await this.motherDuckClient.evaluateQuery(generateQuery);
    const rows = result.data.toRows();
    
    if (!rows[0]?.query) {
      throw new Error('Failed to generate SQL');
    }

    return { sql: rows[0].query, provider: 'motherduck' };
  }

  private async executeSQL(sql: string, tableName: string): Promise<{ data: any[], rowCount: number, target: 'memory' | 'motherduck' }> {
    // Determine execution target
    const useMemory = this.config.enableMaterialization && this.config.preferMemoryExecution;
    
    if (useMemory) {
      try {
        const result = await this.duckdbClient.evaluateQuery(sql);
        const rows = result.data.toRows();
        return { data: rows, rowCount: rows.length, target: 'memory' };
      } catch (error) {
        console.warn('Memory execution failed, falling back to MotherDuck:', error);
      }
    }

    // Execute in MotherDuck
    if (!this.motherDuckClient) {
      throw new Error('MotherDuck client not configured');
    }

    const result = await this.motherDuckClient.evaluateQuery(sql);
    const rows = result.data.toRows();
    return { data: rows, rowCount: rows.length, target: 'motherduck' };
  }

  updateConfig(newConfig: Partial<QueryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Factory function that reads from LaunchDarkly context
export async function createQueryService(
  ldContext: any,
  duckdbClient: any,
  motherDuckClient: MotherDuckClient | null = null
): Promise<ModularQueryService> {
  const config: QueryConfig = {
    enableWebLLM: ldContext.webllm?.enabled || false,
    enableMaterialization: ldContext.materialization?.enabled || false,
    enableSemanticCache: ldContext.semanticCache?.enabled || true,
    enableQueryApproval: ldContext.queryApproval?.enabled || true,
    preferWebLLM: ldContext.webllm?.preferred || false,
    preferMemoryExecution: ldContext.materialization?.preferred || false,
    cacheThreshold: ldContext.semanticCache?.threshold || 0.85,
    autoApproveThreshold: ldContext.queryApproval?.autoThreshold || 0.95
  };

  return await ModularQueryService.create(config, duckdbClient, motherDuckClient);
}
