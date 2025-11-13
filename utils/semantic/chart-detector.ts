// utils/semantic/chart-detector.ts
import type { QueryResponse } from "./webllm-handler.ts";
import type { SemanticConfig } from "./config.ts";

export type ChartType = 'bar' | 'line' | 'heatmap' | 'scatter' | 'pie' | 'funnel';

export interface ChartDetectionResult {
  type: ChartType;
  reason: string;
  config?: any;
}

/**
 * Auto-detect chart type based on query structure (Boring Semantic Layer style)
 * 
 * Rules:
 * 1. Time dimension + measure(s) → Line chart
 * 2. Single dimension + multiple measures → Grouped bar chart
 * 3. Two dimensions + measure → Heatmap
 * 4. Single dimension + single measure → Bar chart
 * 5. No dimensions + measures → KPI card (handled separately)
 * 6. Lifecycle stages → Funnel chart
 */
export function detectChartType(
  query: QueryResponse,
  semanticConfig: SemanticConfig
): ChartDetectionResult {
  const numDimensions = query.dimensions?.length || 0;
  const numMeasures = query.measures?.length || 0;

  // Get dimension metadata
  const modelConfig = semanticConfig[query.table];
  const dimensions = query.dimensions?.map(d => ({
    name: d,
    metadata: modelConfig.dimensions[d]
  })) || [];

  // Rule 1: Time dimension + measure(s) → Line chart
  const hasTimeDimension = dimensions.some(d => 
    d.metadata?.is_time_dimension || 
    d.name.includes('date') || 
    d.name.includes('time')
  );

  if (hasTimeDimension && numMeasures >= 1) {
    return {
      type: 'line',
      reason: 'Time series data detected (date dimension with measures)',
      config: {
        mode: 'lines+markers',
        hovermode: 'x unified'
      }
    };
  }

  // Rule 2: Lifecycle/funnel stages → Funnel chart
  const isFunnelDimension = dimensions.some(d =>
    d.name.includes('lifecycle') || 
    d.name.includes('stage') ||
    d.metadata?.values?.some((v: string) => 
      ['awareness', 'consideration', 'trial', 'activation', 'retention'].includes(v.toLowerCase())
    )
  );

  if (isFunnelDimension && numMeasures === 1) {
    return {
      type: 'funnel',
      reason: 'Lifecycle or conversion stages detected',
      config: {
        textinfo: 'value+percent previous'
      }
    };
  }

  // Rule 3: Two dimensions + measure → Heatmap
  if (numDimensions === 2 && numMeasures === 1) {
    return {
      type: 'heatmap',
      reason: 'Two categorical dimensions with one measure',
      config: {
        colorscale: 'RdYlGn'
      }
    };
  }

  // Rule 4: Single dimension + multiple measures → Grouped bar
  if (numDimensions === 1 && numMeasures > 1) {
    return {
      type: 'bar',
      reason: 'Single dimension with multiple measures - comparing metrics',
      config: {
        barmode: 'group',
        orientation: 'v'
      }
    };
  }

  // Rule 5: Single dimension + single measure (check cardinality)
  if (numDimensions === 1 && numMeasures === 1) {
    const dimension = dimensions[0];
    const isLowCardinality = dimension.metadata?.cardinality === 'low' || 
                            dimension.metadata?.values?.length <= 6;

    // If low cardinality and likely part-to-whole, use pie
    if (isLowCardinality && dimension.metadata?.values?.length <= 5) {
      return {
        type: 'pie',
        reason: 'Low cardinality dimension - showing distribution',
        config: {
          hole: 0.3  // Donut chart
        }
      };
    }

    // Otherwise standard bar chart
    return {
      type: 'bar',
      reason: 'Single categorical dimension with one measure',
      config: {
        orientation: 'v'
      }
    };
  }

  // Rule 6: Multiple dimensions (3+) with measures → Scatter for analysis
  if (numDimensions >= 2 && numMeasures >= 2) {
    return {
      type: 'scatter',
      reason: 'Multiple dimensions and measures - correlation analysis',
      config: {
        mode: 'markers'
      }
    };
  }

  // Default fallback: bar chart
  return {
    type: 'bar',
    reason: 'Default chart type',
    config: {
      orientation: 'v'
    }
  };
}

/**
 * Get chart title from query
 */
export function generateChartTitle(query: QueryResponse): string {
  const measures = query.measures.join(' & ');
  const dimensions = query.dimensions?.join(' by ') || '';
  
  if (dimensions) {
    return `${formatLabel(measures)} by ${formatLabel(dimensions)}`;
  }
  return formatLabel(measures);
}

/**
 * Format label for display
 */
function formatLabel(text: string): string {
  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/Ltv/g, 'LTV')
    .replace(/30d/g, '(30d)');
}