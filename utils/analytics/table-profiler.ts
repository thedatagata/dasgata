// utils/analytics/table-profiler.ts
/**
 * Table profiling using SUMMARIZE and prompt_schema
 */

export interface ColumnSummary {
  column_name: string;
  column_type: string;
  min: any;
  max: any;
  approx_unique: number;
  avg: any;
  std: any;
  q25: any;
  q50: any;
  q75: any;
  count: number;
  null_percentage: number;
}

export interface TableProfile {
  tableName: string;
  fullyQualifiedName: string;
  location: "memory" | "motherduck";

  // Table description from prompt_schema
  description?: string;

  // Column summaries from SUMMARIZE
  columnSummaries: ColumnSummary[];

  profiledAt: string;
}

export class TableProfiler {
  /**
   * Profile table using SUMMARIZE and prompt_schema
   */
  static async profileTable(
    db: any,
    fullyQualifiedName: string,
    location: "memory" | "motherduck" = "memory",
  ): Promise<TableProfile> {
    console.log(`📊 Profiling table: ${fullyQualifiedName}`);

    const [database, schema, table] = fullyQualifiedName.split(".");

    // Get AI description using prompt_schema
    let description: string | undefined;
    try {
      const promptResult = await db.evaluateQuery(
        `CALL prompt_schema(include_tables=['${schema}.${table}'])`,
      );
      const promptRows = promptResult.data.toRows();
      if (promptRows.length > 0 && promptRows[0].summary) {
        description = promptRows[0].summary;
        console.log(`🤖 AI Description: ${description}`);
      }
    } catch (error) {
      console.warn("prompt_schema failed:", error);
    }

    // Get column summaries using SUMMARIZE
    const summaryResult = await db.evaluateQuery(
      `SUMMARIZE ${fullyQualifiedName}`,
    );
    const columnSummaries = summaryResult.data.toRows() as ColumnSummary[];

    return {
      tableName: table,
      fullyQualifiedName,
      location,
      description,
      columnSummaries,
      profiledAt: new Date().toISOString(),
    };
  }
}
