// utils/webllm.ts
import { CreateMLCEngine, ChatCompletionMessageParam } from "@mlc-ai/web-llm";

/**
 * WebLLM Text-to-SQL Engine
 * Runs LLM locally in browser for privacy-first text-to-SQL generation
 */

export interface TableMetadata {
  tableName: string;
  fullyQualifiedName: string;
  rowCount: number;
  columns: ColumnMetadata[];
  sampleData: Record<string, any>[];
  description?: string;
  lastUpdated: string;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  distinctCount?: number;
  minValue?: any;
  maxValue?: any;
  sampleValues?: any[];
  description?: string;
}

class WebLLMTextToSQL {
  private engine: any = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize WebLLM engine with recommended model for SQL generation
   */
  async initialize(onProgress?: (progress: string) => void): Promise<void> {
    if (this.engine) return;
    if (this.isInitializing && this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        // Use Qwen2.5-0.5B for fast SQL generation (350MB download)
        // Alternative: "Phi-3.5-mini-instruct-q4f16_1-MLC" (2.2GB, better quality)
        this.engine = await CreateMLCEngine(
          "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
          {
            initProgressCallback: (progress) => {
              console.log("WebLLM init progress:", progress);
              if (onProgress) {
                onProgress(`Loading model: ${progress.text}`);
              }
            },
          }
        );
        console.log("✅ WebLLM engine initialized");
      } catch (error) {
        console.error("Failed to initialize WebLLM:", error);
        throw error;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate SQL query from natural language using DuckDB metadata context
   */
  async generateSQL(
    userQuestion: string,
    metadata: TableMetadata[],
    dialect: "duckdb" = "duckdb"
  ): Promise<{ sql: string; explanation: string }> {
    if (!this.engine) {
      throw new Error("WebLLM engine not initialized. Call initialize() first.");
    }

    // Build rich context prompt
    const systemPrompt = this.buildSystemPrompt(metadata, dialect);
    
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: `Generate a SQL query to answer this question:\n\n${userQuestion}\n\nProvide:\n1. The SQL query (wrapped in \`\`\`sql code block)\n2. A brief explanation of what the query does` 
      },
    ];

    try {
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.1, // Low temperature for deterministic SQL generation
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || "";
      
      // Extract SQL from code block
      const sqlMatch = response.match(/```sql\n([\s\S]*?)```/);
      const sql = sqlMatch ? sqlMatch[1].trim() : response.trim();
      
      // Extract explanation (everything outside code blocks)
      const explanation = response.replace(/```sql[\s\S]*?```/g, '').trim();

      return { sql, explanation };
    } catch (error) {
      console.error("SQL generation error:", error);
      throw new Error(`Failed to generate SQL: ${error.message}`);
    }
  }

  /**
   * Build comprehensive system prompt with table metadata
   */
  private buildSystemPrompt(metadata: TableMetadata[], dialect: string): string {
    const tableSchemas = metadata.map(table => {
      const columns = table.columns.map(col => {
        let colInfo = `  - ${col.name} (${col.type})`;
        if (col.description) colInfo += ` - ${col.description}`;
        if (col.distinctCount) colInfo += ` [~${col.distinctCount} unique values]`;
        if (col.sampleValues && col.sampleValues.length > 0) {
          colInfo += `\n    Examples: ${col.sampleValues.slice(0, 3).join(', ')}`;
        }
        return colInfo;
      }).join('\n');

      let tableInfo = `\nTable: ${table.fullyQualifiedName}`;
      if (table.description) tableInfo += `\nDescription: ${table.description}`;
      tableInfo += `\nRows: ~${table.rowCount.toLocaleString()}`;
      tableInfo += `\nColumns:\n${columns}`;
      
      if (table.sampleData.length > 0) {
        tableInfo += `\nSample rows:\n${JSON.stringify(table.sampleData.slice(0, 2), null, 2)}`;
      }
      
      return tableInfo;
    }).join('\n---\n');

    return `You are an expert SQL query generator specialized in ${dialect.toUpperCase()}.

## Your Task:
Convert natural language questions into valid SQL queries based on the provided database schema.

## Database Schema:
${tableSchemas}

## Query Guidelines:
1. Use explicit table names (fully qualified: database.schema.table)
2. For DuckDB, use standard SQL with DuckDB-specific functions when needed
3. Always include LIMIT clause for large result sets (default LIMIT 100)
4. Use appropriate aggregations (COUNT, SUM, AVG, etc.)
5. Format dates using strftime or date_trunc as needed
6. Use ILIKE for case-insensitive string matching
7. Add meaningful column aliases for calculated fields
8. Order results by the most relevant column

## Output Format:
Provide the SQL query in a \`\`\`sql code block, followed by a brief explanation.

## Example Response:
\`\`\`sql
SELECT 
  traffic_source,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(revenue) as total_revenue
FROM my_db.amplitude.sessions_fct
WHERE session_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY traffic_source
ORDER BY total_revenue DESC
LIMIT 10;
\`\`\`

This query analyzes traffic sources by counting unique users and summing revenue over the last 30 days, showing the top 10 sources by revenue.`;
  }

  /**
   * Check if WebGPU is available (required for WebLLM)
   */
  static async checkWebGPUSupport(): Promise<boolean> {
    if (!navigator.gpu) {
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup engine resources
   */
  async cleanup(): Promise<void> {
    if (this.engine) {
      // WebLLM doesn't expose explicit cleanup, but setting to null allows GC
      this.engine = null;
      console.log("WebLLM engine cleaned up");
    }
  }
}

// Singleton instance
export const webLLMEngine = new WebLLMTextToSQL();

/**
 * Storage key for table metadata in localStorage
 */
export const METADATA_STORAGE_KEY = "duckdb_table_metadata";

/**
 * Load table metadata from localStorage
 */
export function loadMetadataFromStorage(): TableMetadata[] {
  try {
    const stored = localStorage.getItem(METADATA_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load metadata from storage:", error);
    return [];
  }
}

/**
 * Save table metadata to localStorage
 */
export function saveMetadataToStorage(metadata: TableMetadata[]): void {
  try {
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadata));
    console.log(`✅ Saved metadata for ${metadata.length} tables to localStorage`);
  } catch (error) {
    console.error("Failed to save metadata to storage:", error);
  }
}