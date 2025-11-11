// utils/analytics/unified-query-service.ts
/**
 * Unified query service - routes queries to correct engine (memory vs cloud)
 * and handles execution with caching
 */

import { webLLMEngine, type TableMetadata } from "../webllm.ts";
import { findSimilar, type SimilarityResult } from "./text-similarity.ts";

export interface QueryRequest {
  question: string;
  tableName: string;
  userId?: string;
}

export interface QueryResponse {
  sql: string;
  results: any[];
  executionTime: number;
  engine: 'webllm' | 'motherduck-ai' | 'cached';
  source: 'memory' | 'motherduck';
  rowCount: number;
  columnCount: number;
  explanation?: string;
  sqlExplanation?: string; // from prompt_explain
  promptSimilarity?: number; // similarity between prompt and explanation
  fromCache?: boolean;
}

export interface SuggestedPrompt {
  prompt: string;
  category: 'drill-down' | 'time-series' | 'comparison' | 'aggregation';
  reason: string;
}

export class UnifiedQueryService {
  private db: any;
  private cache: Map<string, QueryResponse> = new Map();
  
  constructor(db: any) {
    this.db = db;
  }
  
  /**
   * Execute natural language query with automatic routing
   */
  async executeQuery(request: QueryRequest): Promise<QueryResponse> {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = this.getCacheKey(request.question, request.tableName);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return {
        ...cached,
        engine: 'cached',
        fromCache: true,
        executionTime: performance.now() - startTime
      };
    }
    
    // Determine table location and route accordingly
    const tableLocation = await this.getTableLocation(request.tableName);
    
    let sql: string;
    let explanation: string | undefined;
    let engine: 'webllm' | 'motherduck-ai';
    
    if (tableLocation === 'memory') {
      // Use WebLLM for materialized tables
      const metadata = await this.getTableMetadata(request.tableName);
      const result = await webLLMEngine.generateSQL(request.question, [metadata]);
      sql = result.sql;
      explanation = result.explanation;
      engine = 'webllm';
    } else {
      // Use MotherDuck AI for streaming tables
      const result = await this.generateSQLWithMotherDuckAI(
        request.question,
        request.tableName
      );
      sql = result.sql;
      explanation = result.explanation;
      engine = 'motherduck-ai';
    }
    
    // Execute query
    const queryResult = await this.db.evaluateQuery(sql);
    const results = queryResult.data.toRows();
    
    // Get SQL explanation using prompt_explain
    let sqlExplanation: string | undefined;
    let promptSimilarity: number | undefined;
    
    if (tableLocation === 'motherduck') {
      try {
        const explainResult = await this.db.evaluateQuery(
          `SELECT explanation FROM prompt_explain('${sql.replace(/'/g, "''")}') LIMIT 1`
        );
        const explainRows = explainResult.data.toRows();
        if (explainRows.length > 0) {
          sqlExplanation = explainRows[0].explanation;
          
          // Calculate similarity between prompt and SQL explanation
          promptSimilarity = this.calculateSimilarity(request.question, sqlExplanation);
        }
      } catch (error) {
        console.warn('prompt_explain failed:', error);
      }
    }
    
    const executionTime = performance.now() - startTime;
    
    const response: QueryResponse = {
      sql,
      results,
      executionTime,
      engine,
      source: tableLocation,
      rowCount: results.length,
      columnCount: results.length > 0 ? Object.keys(results[0]).length : 0,
      explanation,
      sqlExplanation,
      promptSimilarity
    };
    
    // Cache the response
    this.cache.set(cacheKey, response);
    
    return response;
  }
  
  /**
   * Generate SQL using MotherDuck AI
   */
  private async generateSQLWithMotherDuckAI(
    question: string,
    tableName: string
  ): Promise<{ sql: string; explanation?: string }> {
    const aiQuery = `
      SELECT sql FROM (
        SELECT * FROM prompt(
          '${question.replace(/'/g, "''")}',
          database => '${this.extractDatabase(tableName)}',
          tables => ['${tableName}']
        )
      ) LIMIT 1
    `;
    
    const result = await this.db.evaluateQuery(aiQuery);
    const rows = result.data.toRows();
    
    if (rows.length === 0) {
      throw new Error('MotherDuck AI failed to generate SQL');
    }
    
    return {
      sql: rows[0].sql,
      explanation: 'Generated using MotherDuck AI'
    };
  }
  
  /**
   * Get table location (memory or motherduck)
   */
  private async getTableLocation(tableName: string): Promise<'memory' | 'motherduck'> {
    const fullyQualified = this.parseTableName(tableName);
    
    // Check if table exists in memory
    const checkQuery = `
      SELECT COUNT(*) as exists
      FROM duckdb_tables()
      WHERE database_name = 'memory'
        AND schema_name = '${fullyQualified.schema}'
        AND table_name = '${fullyQualified.table}'
    `;
    
    const result = await this.db.evaluateQuery(checkQuery);
    const exists = result.data.toRows()[0].exists > 0;
    
    return exists ? 'memory' : 'motherduck';
  }
  
  /**
   * Get table metadata for WebLLM
   */
  private async getTableMetadata(tableName: string): Promise<TableMetadata> {
    const fullyQualified = this.parseTableName(tableName);
    
    // Get column information
    const columnsQuery = `
      SELECT 
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = '${fullyQualified.schema}'
        AND table_name = '${fullyQualified.table}'
      ORDER BY ordinal_position
    `;
    
    const result = await this.db.evaluateQuery(columnsQuery);
    const columns = result.data.toRows();
    
    return {
      name: tableName,
      schema: columns.map(c => `${c.column_name} ${c.data_type}`).join('\n'),
      description: `Table: ${tableName}`,
      sampleQueries: []
    };
  }
  
  /**
   * Generate suggested follow-up prompts based on results and domain context
   */
  generateSuggestedPrompts(
    originalQuestion: string,
    response: QueryResponse
  ): SuggestedPrompt[] {
    const suggestions: SuggestedPrompt[] = [];
    
    if (response.results.length === 0) {
      return suggestions;
    }
    
    const firstRow = response.results[0];
    const columns = Object.keys(firstRow);
    
    // Detect domain-specific columns
    const revenueColumns = columns.filter(col => 
      col.toLowerCase().includes('revenue') || 
      col.toLowerCase().includes('amount') ||
      col.toLowerCase().includes('total') ||
      col.toLowerCase().includes('value')
    );
    
    const userColumns = columns.filter(col =>
      col.toLowerCase().includes('user') ||
      col.toLowerCase().includes('customer') ||
      col.toLowerCase().includes('visitor')
    );
    
    const dateColumns = columns.filter(col => 
      this.isDateValue(firstRow[col]) || 
      col.toLowerCase().includes('date') ||
      col.toLowerCase().includes('time')
    );
    
    const sourceColumns = columns.filter(col =>
      col.toLowerCase().includes('source') ||
      col.toLowerCase().includes('channel') ||
      col.toLowerCase().includes('campaign')
    );
    
    // Marketing-focused suggestions
    if (revenueColumns.length > 0) {
      const revCol = revenueColumns[0];
      
      suggestions.push({
        prompt: `What's the total ${revCol} over time?`,
        category: 'time-series',
        reason: 'Track revenue trends'
      });
      
      if (sourceColumns.length > 0) {
        suggestions.push({
          prompt: `Which ${sourceColumns[0]} generates the most ${revCol}?`,
          category: 'comparison',
          reason: 'Compare revenue by marketing source'
        });
      }
    }
    
    // User cohort analysis
    if (userColumns.length > 0) {
      suggestions.push({
        prompt: `Show me new vs returning users`,
        category: 'comparison',
        reason: 'Analyze user retention'
      });
      
      suggestions.push({
        prompt: `What's the growth in user count?`,
        category: 'time-series',
        reason: 'Track user acquisition'
      });
    }
    
    // Marketing channel analysis
    if (sourceColumns.length > 0) {
      const sourceCol = sourceColumns[0];
      
      suggestions.push({
        prompt: `Compare performance across ${sourceCol}`,
        category: 'comparison',
        reason: 'Channel effectiveness analysis'
      });
    }
    
    // Time-based trends
    if (dateColumns.length > 0) {
      suggestions.push({
        prompt: `Show daily trends for the last 30 days`,
        category: 'time-series',
        reason: 'Recent performance tracking'
      });
    }
    
    return suggestions.slice(0, 4);
  }
  
  /**
   * Approve query for caching (marks as permanent)
   */
  async approveQuery(question: string, tableName: string): Promise<void> {
    const cacheKey = this.getCacheKey(question, tableName);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      // Store in persistent cache (Deno KV)
      const kv = await Deno.openKv();
      await kv.set(
        ['approved_queries', tableName, cacheKey],
        {
          question,
          ...cached,
          approvedAt: new Date().toISOString()
        }
      );
      console.log(`✅ Approved query: ${question}`);
    }
  }
  
  /**
   * Find similar approved queries using cosine similarity
   */
  async findSimilarQueries(
    question: string,
    tableName: string,
    limit: number = 3
  ): Promise<Array<{ question: string; sql: string; score: number }>> {
    const kv = await Deno.openKv();
    const approvedQueries: Array<{ question: string; sql: string }> = [];
    
    // Get all approved queries for this table
    const iter = kv.list({ prefix: ['approved_queries', tableName] });
    for await (const entry of iter) {
      const data = entry.value as any;
      approvedQueries.push({
        question: data.question,
        sql: data.sql
      });
    }
    
    if (approvedQueries.length === 0) {
      return [];
    }
    
    // Find similar questions
    const candidates = approvedQueries.map(q => q.question);
    const similar = findSimilar(question, candidates, 0.4, limit);
    
    // Map back to full query objects
    return similar.map(s => {
      const query = approvedQueries.find(q => q.question === s.text)!;
      return {
        question: query.question,
        sql: query.sql,
        score: s.score
      };
    });
  }
  
  /**
   * Calculate text similarity (Jaccard)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
  
  /**
   * Helper methods
   */
  private getCacheKey(question: string, tableName: string): string {
    return `${tableName}:${question.toLowerCase().trim()}`;
  }
  
  private parseTableName(tableName: string): { database: string; schema: string; table: string } {
    const parts = tableName.split('.');
    if (parts.length === 3) {
      return { database: parts[0], schema: parts[1], table: parts[2] };
    } else if (parts.length === 2) {
      return { database: 'memory', schema: parts[0], table: parts[1] };
    } else {
      return { database: 'memory', schema: 'main', table: parts[0] };
    }
  }
  
  private extractDatabase(tableName: string): string {
    return this.parseTableName(tableName).database;
  }
  
  private isDateValue(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') {
      // Simple date pattern check
      return /^\d{4}-\d{2}-\d{2}/.test(value);
    }
    return false;
  }
}
