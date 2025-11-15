// utils/analytics/unified-query-service.ts
/**
 * MotherDuck query service for Base Dashboard (Starter Plan)
 * Uses MotherDuck PROMPT for natural language SQL generation
 */

export interface QueryRequest {
  question: string;
  tableName: string;
  userId?: string;
}

export interface QueryResponse {
  sql: string;
  results: any[];
  executionTime: number;
  engine: "motherduck-ai" | "cached";
  source: "motherduck";
  rowCount: number;
  columnCount: number;
  explanation?: string;
  sqlExplanation?: string;
  promptSimilarity?: number;
  fromCache?: boolean;
}

export interface SuggestedPrompt {
  prompt: string;
  category: "drill-down" | "time-series" | "comparison" | "aggregation";
  reason: string;
}

export class UnifiedQueryService {
  private db: any;
  private cache: Map<string, QueryResponse> = new Map();

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Execute natural language query using MotherDuck PROMPT
   */
  async executeQuery(request: QueryRequest): Promise<QueryResponse> {
    const startTime = performance.now();

    // Check cache first
    const cacheKey = this.getCacheKey(request.question, request.tableName);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return {
        ...cached,
        engine: "cached",
        fromCache: true,
        executionTime: performance.now() - startTime,
      };
    }

    // Generate SQL using MotherDuck AI
    const result = await this.generateSQLWithMotherDuckAI(
      request.question,
      request.tableName,
    );

    const sql = result.sql;
    const explanation = result.explanation;

    // Execute query
    const queryResult = await this.db.evaluateQuery(sql);
    const results = queryResult.data.toRows();

    // Get SQL explanation using prompt_explain
    let sqlExplanation: string | undefined;
    let promptSimilarity: number | undefined;

    try {
      const explainResult = await this.db.evaluateQuery(
        `SELECT explanation FROM prompt_explain('${sql.replace(/'/g, "''")}') LIMIT 1`,
      );
      const explainRows = explainResult.data.toRows();
      if (explainRows.length > 0) {
        sqlExplanation = explainRows[0].explanation;
        promptSimilarity = this.calculateSimilarity(request.question, sqlExplanation);
      }
    } catch (error) {
      console.warn("prompt_explain failed:", error);
    }

    const executionTime = performance.now() - startTime;

    const response: QueryResponse = {
      sql,
      results,
      executionTime,
      engine: "motherduck-ai",
      source: "motherduck",
      rowCount: results.length,
      columnCount: results.length > 0 ? Object.keys(results[0]).length : 0,
      explanation,
      sqlExplanation,
      promptSimilarity,
    };

    // Cache the response
    this.cache.set(cacheKey, response);

    return response;
  }

  /**
   * Generate SQL using MotherDuck AI PROMPT
   */
  private async generateSQLWithMotherDuckAI(
    question: string,
    tableName: string,
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
      throw new Error("MotherDuck AI failed to generate SQL");
    }

    return {
      sql: rows[0].sql,
      explanation: "Generated using MotherDuck AI",
    };
  }

  /**
   * Generate suggested follow-up prompts based on results
   */
  generateSuggestedPrompts(
    originalQuestion: string,
    response: QueryResponse,
  ): SuggestedPrompt[] {
    const suggestions: SuggestedPrompt[] = [];

    if (response.results.length === 0) {
      return suggestions;
    }

    const firstRow = response.results[0];
    const columns = Object.keys(firstRow);

    // Detect domain-specific columns
    const revenueColumns = columns.filter((col) =>
      col.toLowerCase().includes("revenue") ||
      col.toLowerCase().includes("amount") ||
      col.toLowerCase().includes("total") ||
      col.toLowerCase().includes("value")
    );

    const userColumns = columns.filter((col) =>
      col.toLowerCase().includes("user") ||
      col.toLowerCase().includes("customer") ||
      col.toLowerCase().includes("visitor")
    );

    const dateColumns = columns.filter((col) =>
      this.isDateValue(firstRow[col]) ||
      col.toLowerCase().includes("date") ||
      col.toLowerCase().includes("time")
    );

    const sourceColumns = columns.filter((col) =>
      col.toLowerCase().includes("source") ||
      col.toLowerCase().includes("channel") ||
      col.toLowerCase().includes("campaign")
    );

    // Marketing-focused suggestions
    if (revenueColumns.length > 0) {
      const revCol = revenueColumns[0];

      suggestions.push({
        prompt: `What's the total ${revCol} over time?`,
        category: "time-series",
        reason: "Track revenue trends",
      });

      if (sourceColumns.length > 0) {
        suggestions.push({
          prompt: `Which ${sourceColumns[0]} generates the most ${revCol}?`,
          category: "comparison",
          reason: "Compare revenue by marketing source",
        });
      }
    }

    // User cohort analysis
    if (userColumns.length > 0) {
      suggestions.push({
        prompt: `Show me new vs returning users`,
        category: "comparison",
        reason: "Analyze user retention",
      });

      suggestions.push({
        prompt: `What's the growth in user count?`,
        category: "time-series",
        reason: "Track user acquisition",
      });
    }

    // Marketing channel analysis
    if (sourceColumns.length > 0) {
      const sourceCol = sourceColumns[0];

      suggestions.push({
        prompt: `Compare performance across ${sourceCol}`,
        category: "comparison",
        reason: "Channel effectiveness analysis",
      });
    }

    // Time-based trends
    if (dateColumns.length > 0) {
      suggestions.push({
        prompt: `Show daily trends for the last 30 days`,
        category: "time-series",
        reason: "Recent performance tracking",
      });
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Approve query for caching
   */
  async approveQuery(question: string, tableName: string): Promise<void> {
    const cacheKey = this.getCacheKey(question, tableName);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const kv = await Deno.openKv();
      await kv.set(
        ["approved_queries", tableName, cacheKey],
        {
          question,
          ...cached,
          approvedAt: new Date().toISOString(),
        },
      );
      console.log(`✅ Approved query: ${question}`);
    }
  }

  /**
   * Calculate text similarity (Jaccard)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
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
    const parts = tableName.split(".");
    if (parts.length === 3) {
      return { database: parts[0], schema: parts[1], table: parts[2] };
    } else if (parts.length === 2) {
      return { database: "memory", schema: parts[0], table: parts[1] };
    } else {
      return { database: "memory", schema: "main", table: parts[0] };
    }
  }

  private extractDatabase(tableName: string): string {
    return this.parseTableName(tableName).database;
  }

  private isDateValue(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === "string") {
      return /^\d{4}-\d{2}-\d{2}/.test(value);
    }
    return false;
  }
}
