// utils/metadata-extractor.ts
import type { TableMetadata, ColumnMetadata } from "./webllm.ts";

/**
 * Extract comprehensive metadata from DuckDB tables for LLM context
 */
export class DuckDBMetadataExtractor {
  /**
   * Get AI-generated schema description from MotherDuck
   */
  static async getSchemaDescription(
    db: any,
    tableNames: string[]
  ): Promise<string | null> {
    try {
      // Use prompt_schema to get semantic description
      const tables = tableNames.map(t => `'${t}'`).join(', ');
      const schemaQuery = `CALL prompt_schema(include_tables=[${tables}]);`;
      
      const result = await db.evaluateQuery(schemaQuery);
      const rows = result.data.toRows();
      
      if (rows.length > 0 && rows[0].summary) {
        return rows[0].summary;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get schema description:', error);
      return null;
    }
  }

  /**
   * Extract metadata for all user tables in DuckDB
   */
  static async extractAllTableMetadata(db: any): Promise<TableMetadata[]> {
    const metadata: TableMetadata[] = [];

    try {
      // Get only WASM materialized tables for WebLLM
      const tablesQuery = `
        SELECT 
          database_name,
          schema_name,
          table_name,
          estimated_size as row_count,
          CONCAT(database_name, '.', schema_name, '.', table_name) as fully_qualified_name
        FROM duckdb_tables()
        WHERE NOT internal 
          AND database_name = 'memory'
          AND schema_name = 'main'
        ORDER BY table_name;
      `;
      
      const tablesResult = await db.evaluateQuery(tablesQuery);
      const tables = tablesResult.data.toRows();

      // Get AI-generated schema description for WASM tables
    const wasmTableNames = tables.map(t => t.fully_qualified_name);
    const schemaDescription = await this.getSchemaDescription(db, wasmTableNames);
    
    if (schemaDescription) {
      console.log('📝 AI Schema Description:', schemaDescription);
    }

    for (const table of tables) {
        const tableMetadata = await this.extractTableMetadata(
        db,
        table.database_name,
        table.schema_name,
        table.table_name,
        table.fully_qualified_name,
        table.row_count,
          schemaDescription
      );
        metadata.push(tableMetadata);
      }

      console.log(`✅ Extracted metadata for ${metadata.length} tables`);
      return metadata;
    } catch (error) {
      console.error("Failed to extract table metadata:", error);
      throw error;
    }
  }

  /**
   * Extract detailed metadata for a single table
   */
  static async extractTableMetadata(
    db: any,
    databaseName: string,
    schemaName: string,
    tableName: string,
    fullyQualifiedName: string,
    estimatedRowCount: number,
    aiDescription?: string | null
  ): Promise<TableMetadata> {
    // Get column metadata
    const columns = await this.extractColumnMetadata(
      db,
      databaseName,
      schemaName,
      tableName,
      fullyQualifiedName
    );

    // Get sample data (first 5 rows)
    const sampleData = await this.extractSampleData(db, fullyQualifiedName, 5);

    return {
      tableName,
      fullyQualifiedName,
      rowCount: estimatedRowCount || 0,
      columns,
      sampleData,
      description: aiDescription || this.generateTableDescription(tableName, columns),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Extract column metadata with statistics
   */
  static async extractColumnMetadata(
    db: any,
    databaseName: string,
    schemaName: string,
    tableName: string,
    fullyQualifiedName: string
  ): Promise<ColumnMetadata[]> {
    try {
      // Get basic column info
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM duckdb_columns()
        WHERE database_name = '${databaseName}'
          AND schema_name = '${schemaName}'
          AND table_name = '${tableName}'
        ORDER BY column_index;
      `;
      
      const columnsResult = await db.evaluateQuery(columnsQuery);
      const columns = columnsResult.data.toRows();

      // Enrich with statistics for each column
      const enrichedColumns: ColumnMetadata[] = [];
      
      for (const col of columns) {
        const stats = await this.getColumnStats(db, fullyQualifiedName, col.column_name, col.data_type);
        
        enrichedColumns.push({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === "YES",
          distinctCount: stats.distinctCount,
          minValue: stats.minValue,
          maxValue: stats.maxValue,
          sampleValues: stats.sampleValues,
          description: this.generateColumnDescription(col.column_name, col.data_type),
        });
      }

      return enrichedColumns;
    } catch (error) {
      console.error(`Failed to extract columns for ${fullyQualifiedName}:`, error);
      return [];
    }
  }

  /**
   * Get statistical information for a column
   */
  static async getColumnStats(
    db: any,
    fullyQualifiedName: string,
    columnName: string,
    dataType: string
  ): Promise<{
    distinctCount: number | null;
    minValue: any;
    maxValue: any;
    sampleValues: any[];
  }> {
    try {
      // Get distinct count for all columns
      const distinctQuery = `
        SELECT COUNT(DISTINCT "${columnName}") as distinct_count
        FROM ${fullyQualifiedName}
        LIMIT 1;
      `;
      const distinctResult = await db.evaluateQuery(distinctQuery);
      const distinctCount = distinctResult.data.toRows()[0]?.distinct_count || null;

      // Get min/max for numeric and date columns
      let minValue = null;
      let maxValue = null;
      
      if (dataType.includes('INT') || dataType.includes('DECIMAL') || 
          dataType.includes('DOUBLE') || dataType.includes('FLOAT') ||
          dataType.includes('DATE') || dataType.includes('TIMESTAMP')) {
        try {
          const minMaxQuery = `
            SELECT 
              MIN("${columnName}") as min_val,
              MAX("${columnName}") as max_val
            FROM ${fullyQualifiedName};
          `;
          const minMaxResult = await db.evaluateQuery(minMaxQuery);
          const stats = minMaxResult.data.toRows()[0];
          minValue = stats?.min_val;
          maxValue = stats?.max_val;
        } catch (e) {
          // Ignore errors for columns that don't support min/max
        }
      }

      // Get sample values (top 5 by frequency for categorical, random for others)
      let sampleValues: any[] = [];
      try {
        const sampleQuery = `
          SELECT DISTINCT "${columnName}"
          FROM ${fullyQualifiedName}
          WHERE "${columnName}" IS NOT NULL
          LIMIT 5;
        `;
        const sampleResult = await db.evaluateQuery(sampleQuery);
        sampleValues = sampleResult.data.toRows().map((row: any) => row[columnName]);
      } catch (e) {
        // Ignore sampling errors
      }

      return { distinctCount, minValue, maxValue, sampleValues };
    } catch (error) {
      console.error(`Failed to get stats for column ${columnName}:`, error);
      return { distinctCount: null, minValue: null, maxValue: null, sampleValues: [] };
    }
  }

  /**
   * Extract sample data rows
   */
  static async extractSampleData(
    db: any,
    fullyQualifiedName: string,
    limit: number = 5
  ): Promise<Record<string, any>[]> {
    try {
      const sampleQuery = `SELECT * FROM ${fullyQualifiedName} LIMIT ${limit};`;
      const result = await db.evaluateQuery(sampleQuery);
      return result.data.toRows();
    } catch (error) {
      console.error(`Failed to extract sample data for ${fullyQualifiedName}:`, error);
      return [];
    }
  }

  /**
   * Generate human-readable table description
   */
  static generateTableDescription(tableName: string, columns: ColumnMetadata[]): string {
    const name = tableName.toLowerCase();
    
    // Detect common table patterns
    if (name.includes('session')) {
      return "Session-level analytics with user behavior and engagement metrics";
    }
    if (name.includes('user')) {
      return "User dimension table with demographic and lifecycle information";
    }
    if (name.includes('event')) {
      return "Event-level data capturing user interactions and activities";
    }
    if (name.includes('fct') || name.includes('fact')) {
      return "Fact table containing measurements and metrics for analysis";
    }
    if (name.includes('dim') || name.includes('dimension')) {
      return "Dimension table with descriptive attributes for filtering and grouping";
    }
    
    return `Analytics table with ${columns.length} columns`;
  }

  /**
   * Generate human-readable column description
   */
  static generateColumnDescription(columnName: string, dataType: string): string | undefined {
    const name = columnName.toLowerCase();
    
    // Revenue/Money
    if (name.includes('revenue') || name.includes('amount') || name.includes('price')) {
      return "Monetary value";
    }
    
    // Dates
    if (name.includes('date') || name.includes('timestamp') || name.includes('time')) {
      return "Temporal dimension for time-based analysis";
    }
    
    // IDs
    if (name.includes('_id') || name === 'id') {
      return "Unique identifier";
    }
    
    // Counts
    if (name.includes('count') || name.includes('total')) {
      return "Aggregated count metric";
    }
    
    // UTM parameters
    if (name.includes('utm_')) {
      return "Marketing attribution parameter";
    }
    
    // Status/Stage
    if (name.includes('status') || name.includes('stage') || name.includes('state')) {
      return "Categorical status indicator";
    }
    
    return undefined;
  }

  /**
   * Refresh metadata for specific tables
   */
  static async refreshTableMetadata(
    db: any,
    tableNames: string[]
  ): Promise<TableMetadata[]> {
    const metadata: TableMetadata[] = [];
    
    // Get AI schema description for all tables at once
    const schemaDescription = await this.getSchemaDescription(db, tableNames);
    
    if (schemaDescription) {
      console.log('🔄 Refreshed AI Schema Description:', schemaDescription);
    }
    
    for (const fqn of tableNames) {
      try {
        // Parse fully qualified name
        const parts = fqn.split('.');
        if (parts.length !== 3) {
          console.warn(`Invalid table name format: ${fqn}`);
          continue;
        }
        
        const [databaseName, schemaName, tableName] = parts;
        
        // Get estimated row count
        const countQuery = `
          SELECT estimated_size 
          FROM duckdb_tables()
          WHERE database_name = '${databaseName}'
            AND schema_name = '${schemaName}'
            AND table_name = '${tableName}';
        `;
        const countResult = await db.evaluateQuery(countQuery);
        const rowCount = countResult.data.toRows()[0]?.estimated_size || 0;
        
        const tableMetadata = await this.extractTableMetadata(
          db,
          databaseName,
          schemaName,
          tableName,
          fqn,
          rowCount,
          schemaDescription
        );
        
        metadata.push(tableMetadata);
      } catch (error) {
        console.error(`Failed to refresh metadata for ${fqn}:`, error);
      }
    }
    
    return metadata;
  }
}