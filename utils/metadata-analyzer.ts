// Metadata analysis for smart dashboard
export interface ColumnMetadata {
  name: string;
  type: string;
  isNullable: boolean;
  sampleValues?: any[];
  distinctCount?: number;
  minValue?: any;
  maxValue?: any;
  avgValue?: number;
}

export interface TableMetadata {
  name: string;
  fullName: string;
  rowCount: number;
  columns: ColumnMetadata[];
  timeseriesColumn?: string;
  numericColumns: string[];
  categoricalColumns: string[];
  granularity?: 'day' | 'month' | 'year' | 'hour';
}

export interface AutoVisualization {
  type: 'line' | 'bar' | 'area' | 'grouped-bar' | 'kpi' | 'table';
  title: string;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  description: string;
}

export interface SuggestedQuestion {
  question: string;
  sql: string;
  visualization: AutoVisualization;
}

export class MetadataAnalyzer {
  /**
   * Analyze table metadata from DuckDB
   */
  static async analyzeTable(client: any, tableName: string): Promise<TableMetadata> {
    // Get column info
    const parts = tableName.split('.');
    const database = parts[0] || 'memory';
    const schema = parts[1] || 'main';
    const table = parts[2] || parts[0];
    
    const columnsResult = await client.evaluateQuery(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable
      FROM duckdb_columns()
      WHERE database_name = '${database}'
        AND schema_name = '${schema}'
        AND table_name = '${table}'
      ORDER BY column_index
    `);
    
    const columns: ColumnMetadata[] = columnsResult.data.toRows();
    
    // Get row count
    const countResult = await client.evaluateQuery(`SELECT COUNT(*) as cnt FROM ${tableName}`);
    const rowCount = countResult.data.toRows()[0].cnt;
    
    // Analyze columns
    const timeseriesColumn = this.detectTimeseriesColumn(columns);
    const numericColumns = this.detectNumericColumns(columns);
    const categoricalColumns = this.detectCategoricalColumns(columns, numericColumns, timeseriesColumn);
    
    let granularity: 'day' | 'month' | 'year' | 'hour' | undefined;
    if (timeseriesColumn) {
      granularity = await this.detectGranularity(client, tableName, timeseriesColumn);
    }
    
    // Get sample values and stats for important columns
    const enrichedColumns = await this.enrichColumns(client, tableName, columns, numericColumns);
    
    return {
      name: table,
      fullName: tableName,
      rowCount,
      columns: enrichedColumns,
      timeseriesColumn,
      numericColumns,
      categoricalColumns,
      granularity
    };
  }
  
  /**
   * Detect timeseries column (date/datetime/timestamp types)
   */
  private static detectTimeseriesColumn(columns: ColumnMetadata[]): string | undefined {
    const timeTypes = ['DATE', 'DATETIME', 'TIMESTAMP', 'TIMESTAMP_MS', 'TIMESTAMP_S'];
    const timeColumn = columns.find(col => 
      timeTypes.some(type => col.type.toUpperCase().includes(type))
    );
    return timeColumn?.name;
  }
  
  /**
   * Detect numeric columns suitable for aggregation
   */
  private static detectNumericColumns(columns: ColumnMetadata[]): string[] {
    const numericTypes = ['INTEGER', 'BIGINT', 'DOUBLE', 'FLOAT', 'DECIMAL', 'NUMERIC', 'REAL'];
    return columns
      .filter(col => numericTypes.some(type => col.type.toUpperCase().includes(type)))
      .map(col => col.name);
  }
  
  /**
   * Detect categorical columns (string types with reasonable cardinality)
   */
  private static detectCategoricalColumns(
    columns: ColumnMetadata[], 
    numericColumns: string[], 
    timeseriesColumn?: string
  ): string[] {
    return columns
      .filter(col => 
        col.type.toUpperCase().includes('VARCHAR') || 
        col.type.toUpperCase().includes('TEXT') ||
        col.type.toUpperCase().includes('STRING')
      )
      .filter(col => col.name !== timeseriesColumn)
      .map(col => col.name);
  }
  
  /**
   * Detect time granularity by checking date intervals
   */
  private static async detectGranularity(
    client: any, 
    tableName: string, 
    timeColumn: string
  ): Promise<'day' | 'month' | 'year' | 'hour'> {
    try {
      const result = await client.evaluateQuery(`
        SELECT 
          DATE_DIFF('day', MIN(${timeColumn}), MAX(${timeColumn})) as day_range,
          COUNT(DISTINCT DATE_TRUNC('day', ${timeColumn})) as distinct_days,
          COUNT(DISTINCT DATE_TRUNC('month', ${timeColumn})) as distinct_months,
          COUNT(DISTINCT DATE_TRUNC('hour', ${timeColumn})) as distinct_hours,
          COUNT(*) as total_rows
        FROM ${tableName}
      `);
      
      const stats = result.data.toRows()[0];
      
      // If we have hourly granularity (more hours than days)
      if (stats.distinct_hours > stats.distinct_days * 2) {
        return 'hour';
      }
      
      // If we have daily data (multiple rows per day or many distinct days)
      if (stats.distinct_days > stats.distinct_months * 5) {
        return 'day';
      }
      
      // If span is over 2 years
      if (stats.day_range > 730) {
        return 'year';
      }
      
      // Default to month for anything else
      return 'month';
    } catch {
      return 'day'; // fallback
    }
  }
  
  /**
   * Enrich columns with sample values and statistics
   */
  private static async enrichColumns(
    client: any,
    tableName: string,
    columns: ColumnMetadata[],
    numericColumns: string[]
  ): Promise<ColumnMetadata[]> {
    const enriched: ColumnMetadata[] = [];
    
    for (const col of columns) {
      const enrichedCol = { ...col };
      
      try {
        // Get sample values
        const sampleResult = await client.evaluateQuery(`
          SELECT DISTINCT ${col.name} as val 
          FROM ${tableName} 
          WHERE ${col.name} IS NOT NULL 
          LIMIT 5
        `);
        enrichedCol.sampleValues = sampleResult.data.toRows().map((r: any) => r.val);
        
        // Get distinct count
        const distinctResult = await client.evaluateQuery(`
          SELECT COUNT(DISTINCT ${col.name}) as cnt FROM ${tableName}
        `);
        enrichedCol.distinctCount = distinctResult.data.toRows()[0].cnt;
        
        // For numeric columns, get min/max/avg
        if (numericColumns.includes(col.name)) {
          const statsResult = await client.evaluateQuery(`
            SELECT 
              MIN(${col.name}) as min_val,
              MAX(${col.name}) as max_val,
              AVG(${col.name}) as avg_val
            FROM ${tableName}
          `);
          const stats = statsResult.data.toRows()[0];
          enrichedCol.minValue = stats.min_val;
          enrichedCol.maxValue = stats.max_val;
          enrichedCol.avgValue = stats.avg_val;
        }
      } catch (err) {
        console.warn(`Failed to enrich column ${col.name}:`, err);
      }
      
      enriched.push(enrichedCol);
    }
    
    return enriched;
  }
  
  /**
   * Generate automatic visualizations based on metadata
   */
  static generateAutoVisualizations(metadata: TableMetadata): AutoVisualization[] {
    const vizs: AutoVisualization[] = [];
    
    // Time series viz
    if (metadata.timeseriesColumn && metadata.numericColumns.length > 0) {
      const metric = metadata.numericColumns[0];
      
      if (metadata.granularity === 'day' || metadata.granularity === 'hour') {
        vizs.push({
          type: 'line',
          title: `${metric} over time`,
          xAxis: metadata.timeseriesColumn,
          yAxis: metric,
          description: `Line chart showing ${metric} trend over ${metadata.granularity}`
        });
      } else if (metadata.granularity === 'month' || metadata.granularity === 'year') {
        vizs.push({
          type: 'bar',
          title: `${metric} by ${metadata.granularity}`,
          xAxis: metadata.timeseriesColumn,
          yAxis: metric,
          description: `Bar chart showing ${metric} aggregated by ${metadata.granularity}`
        });
      }
    }
    
    // Categorical breakdown
    if (metadata.categoricalColumns.length > 0 && metadata.numericColumns.length > 0) {
      const category = metadata.categoricalColumns[0];
      const metric = metadata.numericColumns[0];
      
      vizs.push({
        type: 'grouped-bar',
        title: `${metric} by ${category}`,
        xAxis: category,
        yAxis: metric,
        description: `Compare ${metric} across different ${category} values`
      });
    }
    
    // KPI card for single metric
    if (metadata.numericColumns.length > 0) {
      const metric = metadata.numericColumns[0];
      vizs.push({
        type: 'kpi',
        title: `Total ${metric}`,
        yAxis: metric,
        description: `Key metric showing total ${metric}`
      });
    }
    
    return vizs;
  }
  
  /**
   * Generate suggested questions based on metadata
   */
  static generateSuggestedQuestions(metadata: TableMetadata): SuggestedQuestion[] {
    const questions: SuggestedQuestion[] = [];
    
    // Time trend question
    if (metadata.timeseriesColumn && metadata.numericColumns.length > 0) {
      const metric = metadata.numericColumns[0];
      const timeCol = metadata.timeseriesColumn;
      
      questions.push({
        question: `What's the trend in ${metric} over time?`,
        sql: `SELECT ${timeCol}, SUM(${metric}) as total_${metric} FROM ${metadata.fullName} GROUP BY ${timeCol} ORDER BY ${timeCol}`,
        visualization: {
          type: metadata.granularity === 'day' ? 'line' : 'bar',
          title: `${metric} trend`,
          xAxis: timeCol,
          yAxis: `total_${metric}`,
          description: `${metric} over time`
        }
      });
    }
    
    // Top N categorical question
    if (metadata.categoricalColumns.length > 0 && metadata.numericColumns.length > 0) {
      const category = metadata.categoricalColumns[0];
      const metric = metadata.numericColumns[0];
      
      questions.push({
        question: `Which ${category} has the highest ${metric}?`,
        sql: `SELECT ${category}, SUM(${metric}) as total_${metric} FROM ${metadata.fullName} GROUP BY ${category} ORDER BY total_${metric} DESC LIMIT 10`,
        visualization: {
          type: 'grouped-bar',
          title: `Top ${category} by ${metric}`,
          xAxis: category,
          yAxis: `total_${metric}`,
          description: `Top 10 ${category} ranked by ${metric}`
        }
      });
    }
    
    // Distribution question
    if (metadata.numericColumns.length > 0) {
      const metric = metadata.numericColumns[0];
      questions.push({
        question: `Show me the distribution of ${metric}`,
        sql: `SELECT ${metric}, COUNT(*) as frequency FROM ${metadata.fullName} GROUP BY ${metric} ORDER BY ${metric}`,
        visualization: {
          type: 'bar',
          title: `${metric} distribution`,
          xAxis: metric,
          yAxis: 'frequency',
          description: `Frequency distribution of ${metric}`
        }
      });
    }
    
    return questions;
  }
}
