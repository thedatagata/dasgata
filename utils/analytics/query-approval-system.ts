// utils/query-approval-system.ts
/**
 * Query Approval and Caching System
 *
 * This service manages:
 * 1. Storing approved queries with their natural language prompts
 * 2. Caching recent query results
 * 3. Finding similar queries using semantic search (Transformer.js)
 * 4. Providing UI hooks for reloading cached results
 *
 * Design is modular to allow feature flag integration later
 */

import type { QueryResult } from "./query-engine.ts";

/**
 * Approved query entry
 */
export interface ApprovedQuery {
  id: string;
  naturalLanguageQuery: string;
  sql: string;
  tableName: string;
  provider: string;
  approvedAt: number;
  approvedBy?: string;
  executionCount: number;
  lastExecuted: number;
  avgExecutionTimeMs: number;
}

/**
 * Cached query entry
 */
export interface CachedQuery {
  id: string;
  queryResult: QueryResult;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

/**
 * Similar query match
 */
export interface SimilarQuery {
  query: ApprovedQuery;
  similarity: number;
}

/**
 * Query Approval System Configuration
 */
export interface QueryApprovalConfig {
  enableSemanticSearch: boolean;
  maxCachedQueries: number;
  cacheTTLMinutes: number;
  similarityThreshold: number;
}

/**
 * Query Approval and Caching System
 *
 * This service manages approved queries and query caching
 * All storage is in-memory for now, but can be moved to KV store
 */
export class QueryApprovalSystem {
  private config: QueryApprovalConfig;
  private approvedQueries: Map<string, ApprovedQuery>;
  private queryCache: Map<string, CachedQuery>;

  constructor(config: QueryApprovalConfig) {
    this.config = config;
    this.approvedQueries = new Map();
    this.queryCache = new Map();
  }

  /**
   * Approve a query for future reference
   */
  approveQuery(
    queryResult: QueryResult,
    approvedBy?: string,
  ): ApprovedQuery {
    const id = this._generateQueryId(
      queryResult.naturalLanguageQuery,
      queryResult.tableName,
    );

    const existingQuery = this.approvedQueries.get(id);

    if (existingQuery) {
      // Update existing entry
      existingQuery.executionCount++;
      existingQuery.lastExecuted = Date.now();
      existingQuery.avgExecutionTimeMs =
        (existingQuery.avgExecutionTimeMs * (existingQuery.executionCount - 1) +
          queryResult.executed.executionTimeMs) / existingQuery.executionCount;
      this.approvedQueries.set(id, existingQuery);
      return existingQuery;
    }

    // Create new approved query
    const approvedQuery: ApprovedQuery = {
      id,
      naturalLanguageQuery: queryResult.naturalLanguageQuery,
      sql: queryResult.generated.sql,
      tableName: queryResult.tableName,
      provider: queryResult.generated.provider,
      approvedAt: Date.now(),
      approvedBy,
      executionCount: 1,
      lastExecuted: Date.now(),
      avgExecutionTimeMs: queryResult.executed.executionTimeMs,
    };

    this.approvedQueries.set(id, approvedQuery);
    return approvedQuery;
  }

  /**
   * Get all approved queries for a table
   */
  getApprovedQueries(tableName?: string): ApprovedQuery[] {
    const queries = Array.from(this.approvedQueries.values());

    if (tableName) {
      return queries.filter((q) => q.tableName === tableName);
    }

    return queries.sort((a, b) => b.lastExecuted - a.lastExecuted);
  }

  /**
   * Cache a query result
   */
  cacheQuery(queryResult: QueryResult): CachedQuery {
    const id = this._generateQueryId(
      queryResult.naturalLanguageQuery,
      queryResult.tableName,
    );

    // Check if already cached
    const existing = this.queryCache.get(id);
    if (existing) {
      existing.hitCount++;
      return existing;
    }

    // Create new cache entry
    const cachedQuery: CachedQuery = {
      id,
      queryResult,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (this.config.cacheTTLMinutes * 60 * 1000),
      hitCount: 0,
    };

    // Add to cache
    this.queryCache.set(id, cachedQuery);

    // Enforce max cache size (LRU-style)
    if (this.queryCache.size > this.config.maxCachedQueries) {
      this._evictOldestCache();
    }

    return cachedQuery;
  }

  /**
   * Get cached query if available
   */
  getCachedQuery(
    naturalLanguageQuery: string,
    tableName: string,
  ): QueryResult | null {
    const id = this._generateQueryId(naturalLanguageQuery, tableName);
    const cached = this.queryCache.get(id);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.queryCache.delete(id);
      return null;
    }

    cached.hitCount++;
    return cached.queryResult;
  }

  /**
   * Get recent cached queries
   */
  getRecentQueries(limit: number = 10): CachedQuery[] {
    return Array.from(this.queryCache.values())
      .sort((a, b) => b.cachedAt - a.cachedAt)
      .slice(0, limit);
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let clearedCount = 0;

    for (const [id, cached] of this.queryCache.entries()) {
      if (now > cached.expiresAt) {
        this.queryCache.delete(id);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Find similar approved queries using semantic search
   *
   * NOTE: This is a placeholder for Transformer.js integration
   * Transformer.js would provide embeddings for semantic similarity
   */
  async findSimilarQueries(
    naturalLanguageQuery: string,
    tableName: string,
    limit: number = 5,
  ): Promise<SimilarQuery[]> {
    const approvedQueries = this.getApprovedQueries(tableName);

    if (!this.config.enableSemanticSearch) {
      // Fallback to simple keyword matching
      return this._findSimilarQueriesKeyword(naturalLanguageQuery, approvedQueries, limit);
    }

    // TODO: Integrate Transformer.js for semantic embeddings
    // For now, use keyword matching
    return this._findSimilarQueriesKeyword(naturalLanguageQuery, approvedQueries, limit);
  }

  /**
   * Private: Simple keyword-based similarity matching
   */
  private _findSimilarQueriesKeyword(
    query: string,
    approvedQueries: ApprovedQuery[],
    limit: number,
  ): SimilarQuery[] {
    const queryWords = query.toLowerCase().split(/\s+/);

    const scored = approvedQueries.map((approved) => {
      const approvedWords = approved.naturalLanguageQuery.toLowerCase().split(/\s+/);
      const commonWords = queryWords.filter((w) => approvedWords.includes(w));
      const similarity = commonWords.length / Math.max(queryWords.length, approvedWords.length);

      return { query: approved, similarity };
    });

    return scored
      .filter((s) => s.similarity >= this.config.similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Private: Generate consistent ID for query
   */
  private _generateQueryId(naturalLanguageQuery: string, tableName: string): string {
    const combined = `${tableName}:${naturalLanguageQuery.toLowerCase().trim()}`;
    return this._simpleHash(combined);
  }

  /**
   * Private: Simple string hashing
   */
  private _simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Private: Evict oldest cache entry
   */
  private _evictOldestCache(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, cached] of this.queryCache.entries()) {
      if (cached.cachedAt < oldestTime) {
        oldestTime = cached.cachedAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.queryCache.delete(oldestId);
    }
  }
}

/**
 * Helper: Create default configuration
 */
export function createDefaultApprovalConfig(): QueryApprovalConfig {
  return {
    enableSemanticSearch: false, // Will enable after Transformer.js integration
    maxCachedQueries: 100,
    cacheTTLMinutes: 60,
    similarityThreshold: 0.3,
  };
}
