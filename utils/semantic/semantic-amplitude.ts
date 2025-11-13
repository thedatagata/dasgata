// utils/semantic/amplitude.ts
import * as duckdb from "@duckdb/duckdb-wasm";
import { getModelConfig, type ModelConfig } from "./config.ts";

interface QuerySpec {
  dimensions?: string[];
  measures?: string[];
  filters?: string[];
  limit?: number;
}

export class SemanticTable {
  private config: ModelConfig;

  constructor(
    private db: duckdb.AsyncDuckDB,
    private modelName: "sessions" | "users"
  ) {
    this.config = getModelConfig(modelName);
  }

  async query(opts: QuerySpec) {
    const selectCols = [
      ...(opts.dimensions?.map(d => this.getDimensionSQL(d)) || []),
      ...(opts.measures?.map(m => this.getMeasureSQL(m)) || [])
    ];

    const sql = `
      SELECT ${selectCols.join(", ")}
      FROM ${this.config.table}
      ${opts.filters?.length ? `WHERE ${opts.filters.join(" AND ")}` : ""}
      ${opts.dimensions?.length ? `GROUP BY ${opts.dimensions.map((_, i) => i + 1).join(", ")}` : ""}
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;

    const conn = await this.db.connect();
    const result = await conn.query(sql);
    await conn.close();
    
    return result.toArray();
  }

  private getDimensionSQL(name: string): string {
    const dim = this.config.dimensions[name];
    if (!dim) throw new Error(`Unknown dimension: ${name}`);
    
    if (dim.sql) {
      return `(${dim.sql}) as ${name}`;
    }
    return `${dim.column} as ${name}`;
  }

  private getMeasureSQL(name: string): string {
    const measure = this.config.measures[name];
    if (!measure) throw new Error(`Unknown measure: ${name}`);
    
    // Convert semantic aggregation syntax to SQL
    let sql = measure.aggregation
      .replace(/\._\./g, '')  // Remove _. prefix
      .replace(/COUNT\(\*\)/gi, 'COUNT(*)')
      .replace(/SUM\(/gi, 'SUM(')
      .replace(/AVG\(/gi, 'AVG(')
      .replace(/MAX\(/gi, 'MAX(')
      .replace(/MIN\(/gi, 'MIN(');
    
    return `${sql} as ${name}`;
  }

  getMetadata() {
    return {
      table: this.config.table,
      description: this.config.description,
      dimensions: this.config.dimensions,
      measures: this.config.measures,
    };
  }
}

export function createSemanticTables(db: duckdb.AsyncDuckDB) {
  return {
    sessions: new SemanticTable(db, "sessions"),
    users: new SemanticTable(db, "users")
  };
}