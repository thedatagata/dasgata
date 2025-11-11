// utils/analytics/visualization-generator.ts
/**
 * Automatic visualization generator based on query results
 */

export interface VisualizationSpec {
  type: 'bar' | 'line' | 'area' | 'none';
  xColumn: string;
  yColumn: string;
  xType: 'categorical' | 'temporal' | 'numeric';
  yType: 'numeric';
  title: string;
  reason: string;
}

export interface VisualizationOptions {
  type: 'bar' | 'line' | 'area';
  xColumn: string;
  yColumn: string;
  title?: string;
  color?: string;
}

export class VisualizationGenerator {
  /**
   * Automatically determine best visualization for results
   */
  static analyzeResults(results: any[], sql: string): VisualizationSpec | null {
    if (results.length === 0) {
      return null;
    }
    
    const firstRow = results[0];
    const columns = Object.keys(firstRow);
    
    // Identify column types
    const dateColumns = columns.filter(col => this.isDateColumn(col, firstRow[col]));
    const numericColumns = columns.filter(col => this.isNumericColumn(firstRow[col]));
    const categoricalColumns = columns.filter(col => 
      !dateColumns.includes(col) && !numericColumns.includes(col)
    );
    
    // Rule 1: Date + Numeric = Line Chart
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      return {
        type: 'line',
        xColumn: dateColumns[0],
        yColumn: numericColumns[0],
        xType: 'temporal',
        yType: 'numeric',
        title: `${numericColumns[0]} over time`,
        reason: 'Time series data detected'
      };
    }
    
    // Rule 2: Categorical + Numeric (with GROUP BY) = Bar Chart
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      const hasAggregation = this.detectAggregation(sql);
      const hasGroupBy = sql.toLowerCase().includes('group by');
      
      if (hasAggregation || hasGroupBy) {
        return {
          type: 'bar',
          xColumn: categoricalColumns[0],
          yColumn: numericColumns[0],
          xType: 'categorical',
          yType: 'numeric',
          title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
          reason: 'Aggregated categorical data detected'
        };
      }
    }
    
    // Rule 3: Multiple numeric columns = Bar chart of first
    if (numericColumns.length >= 2 && categoricalColumns.length > 0) {
      return {
        type: 'bar',
        xColumn: categoricalColumns[0],
        yColumn: numericColumns[0],
        xType: 'categorical',
        yType: 'numeric',
        title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
        reason: 'Multiple metrics detected'
      };
    }
    
    return null;
  }
  
  /**
   * Generate Observable Plot spec
   */
  static generatePlotSpec(
    results: any[],
    options: VisualizationOptions
  ): string {
    const { type, xColumn, yColumn, title, color = '#90C137' } = options;
    
    // Build mark configuration
    const markConfig = {
      x: xColumn,
      y: yColumn,
      fill: color,
      tip: true
    };
    
    let marks: string[];
    
    switch (type) {
      case 'bar':
        marks = [
          `Plot.barY(data, ${JSON.stringify(markConfig)})`,
          `Plot.ruleY([0])`
        ];
        break;
        
      case 'line':
        marks = [
          `Plot.lineY(data, ${JSON.stringify({ ...markConfig, stroke: color, fill: undefined })})`,
          `Plot.dot(data, ${JSON.stringify({ ...markConfig, fill: color })})`
        ];
        break;
        
      case 'area':
        marks = [
          `Plot.areaY(data, ${JSON.stringify(markConfig)})`,
          `Plot.lineY(data, ${JSON.stringify({ ...markConfig, stroke: color, fill: undefined })})`
        ];
        break;
        
      default:
        marks = [];
    }
    
    return `
      Plot.plot({
        marks: [
          ${marks.join(',\n          ')}
        ],
        x: { label: "${xColumn}" },
        y: { label: "${yColumn}", grid: true },
        ${title ? `title: "${title}",` : ''}
        style: {
          fontSize: "12px",
          background: "transparent"
        },
        marginLeft: 60,
        marginBottom: 40,
        width: 800,
        height: 400
      })
    `;
  }
  
  /**
   * Helper: Check if column is a date
   */
  private static isDateColumn(columnName: string, value: any): boolean {
    const dateKeywords = ['date', 'time', 'timestamp', 'datetime', 'year', 'month', 'day'];
    const nameIsDate = dateKeywords.some(keyword => 
      columnName.toLowerCase().includes(keyword)
    );
    
    if (nameIsDate) return true;
    
    // Check value pattern
    if (value instanceof Date) return true;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return true;
    
    return false;
  }
  
  /**
   * Helper: Check if column is numeric
   */
  private static isNumericColumn(value: any): boolean {
    return typeof value === 'number';
  }
  
  /**
   * Helper: Detect aggregation in SQL
   */
  private static detectAggregation(sql: string): boolean {
    const aggregationFunctions = [
      'count', 'sum', 'avg', 'min', 'max', 'stddev', 'variance'
    ];
    const lowerSQL = sql.toLowerCase();
    return aggregationFunctions.some(fn => lowerSQL.includes(`${fn}(`));
  }
  
  /**
   * Generate high-level analysis of results
   */
  static generateAnalysis(results: any[], vizSpec: VisualizationSpec | null): string {
    if (results.length === 0) {
      return 'No results returned from query.';
    }
    
    const analysis: string[] = [];
    
    // Row count
    analysis.push(`Retrieved ${results.length} row${results.length !== 1 ? 's' : ''}.`);
    
    // If visualization exists, describe it
    if (vizSpec) {
      analysis.push(`Visualizing ${vizSpec.yColumn} ${vizSpec.xType === 'temporal' ? 'over time' : `by ${vizSpec.xColumn}`}.`);
      
      // Find interesting patterns
      if (vizSpec.yType === 'numeric') {
        const values = results.map(r => r[vizSpec.yColumn]).filter(v => typeof v === 'number');
        
        if (values.length > 0) {
          const max = Math.max(...values);
          const min = Math.min(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          
          const maxRow = results.find(r => r[vizSpec.yColumn] === max);
          const minRow = results.find(r => r[vizSpec.yColumn] === min);
          
          analysis.push(
            `Highest value: ${max.toLocaleString()} (${maxRow?.[vizSpec.xColumn] || 'N/A'}).`
          );
          analysis.push(
            `Lowest value: ${min.toLocaleString()} (${minRow?.[vizSpec.xColumn] || 'N/A'}).`
          );
          analysis.push(
            `Average: ${avg.toFixed(2).replace(/\.?0+$/, '').replace(/(\.\d)$/, '$1')}.`
          );
        }
      }
    }
    
    return analysis.join(' ');
  }
}
