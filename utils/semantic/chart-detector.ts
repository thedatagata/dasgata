// utils/semantic/chart-detector.ts
import type { QueryResponse } from "./webllm-handler.ts";
import type { SemanticConfig } from "./config.ts";

export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "funnel"
  | "heatmap"
  | "biaxial-bar"
  | "stacked-bar"
  | "area-fill-by-value";

export interface ChartDetectionResult {
  type: ChartType;
  reason: string;
  config?: any;
}

/**
 * Auto-detect chart type based on query structure
 *
 * Rules:
 * 1. Time dimension + measure(s) → Line chart or area with fill by value
 * 2. Lifecycle stages → Funnel chart
 * 3. One dimension + multiple metrics → Biaxial bar chart
 * 4. Few groups in dimension → Stacked bar chart
 * 5. Multiple dimensions + 1 metric → Stacked bar chart
 * 6. Two dimensions + measure → Heatmap
 */
export function detectChartType(
  query: QueryResponse,
  semanticConfig: SemanticConfig,
): ChartDetectionResult {
  const numDimensions = query.dimensions?.length || 0;
  const numMeasures = query.measures?.length || 0;

  // Get dimension metadata
  const modelConfig = semanticConfig[query.table];
  const dimensions = query.dimensions?.map((d) => ({
    name: d,
    metadata: modelConfig.dimensions[d],
  })) || [];

  // Check for retention/churn metrics (area fill by value)
  const hasRetentionMetric = query.measures?.some((m) =>
    m.includes("retention") ||
    m.includes("churn") ||
    m.includes("net_") ||
    m.includes("growth")
  );

  // Rule 1: Time dimension + retention metrics → Area fill by value
  const hasTimeDimension = dimensions.some((d) =>
    d.metadata?.is_time_dimension ||
    d.name.includes("date") ||
    d.name.includes("time")
  );

  if (hasTimeDimension && hasRetentionMetric && numMeasures === 1) {
    return {
      type: "area-fill-by-value",
      reason: "Time series with retention/growth metric - showing positive/negative trends",
      config: {
        fillByValue: true,
        positiveColor: "green",
        negativeColor: "red",
      },
    };
  }

  // Rule 2: Time dimension + multiple measures → Line chart
  if (hasTimeDimension && numMeasures > 1) {
    return {
      type: "line",
      reason: "Time series data with multiple metrics",
      config: {
        showLegend: true,
      },
    };
  }

  // Rule 3: Time dimension + single measure → Line chart
  if (hasTimeDimension && numMeasures === 1) {
    return {
      type: "line",
      reason: "Time series data detected",
      config: {},
    };
  }

  // Rule 4: Lifecycle/funnel stages → Funnel chart
  const isFunnelDimension = dimensions.some((d) =>
    d.name.includes("lifecycle") ||
    d.name.includes("stage") ||
    d.metadata?.values?.some((v: string) =>
      ["awareness", "consideration", "trial", "activation", "retention"].includes(v.toLowerCase())
    )
  );

  if (isFunnelDimension && numMeasures === 1) {
    return {
      type: "funnel",
      reason: "Lifecycle or conversion stages detected",
      config: {},
    };
  }

  // Rule 5: One dimension + multiple metrics → Biaxial bar chart
  if (numDimensions === 1 && numMeasures >= 2) {
    return {
      type: "biaxial-bar",
      reason: "Single dimension with multiple metrics - comparing different scales",
      config: {
        leftAxis: query.measures[0],
        rightAxis: query.measures[1],
      },
    };
  }

  // Rule 6: Two dimensions + measure → Check for cohort analysis patterns
  if (numDimensions === 2 && numMeasures === 1) {
    // Cohort heatmap: first_event_date + periods_since + retention_metric
    const hasCohortDimension = dimensions.some((d) =>
      d.name.includes("first_") ||
      d.name.includes("cohort") ||
      d.name.includes("signup_date")
    );

    const hasPeriodDimension = dimensions.some((d) =>
      d.name.includes("period") ||
      d.name.includes("week") ||
      d.name.includes("day_") ||
      d.name.includes("months_since") ||
      d.name.includes("weeks_since")
    );

    if (hasCohortDimension && hasPeriodDimension) {
      return {
        type: "heatmap",
        reason: "Cohort analysis detected - first event date vs. periods since",
        config: {},
      };
    }

    // Otherwise use stacked bar for two dimensions
    return {
      type: "stacked-bar",
      reason: "Two dimensions with one metric - showing breakdown",
      config: {
        stacked: true,
      },
    };
  }

  // Additional: Retention curve (line chart for duration analysis)
  const isRetentionDuration = hasTimeDimension &&
    query.measures?.some((m) =>
      m.includes("retention") ||
      m.includes("survival") ||
      m.includes("days_to_") ||
      m.includes("time_to_")
    );

  if (isRetentionDuration) {
    return {
      type: "line",
      reason: "Retention/survival curve - showing duration over time",
      config: {},
    };
  }

  // Rule 7: One dimension with low cardinality → Stacked bar
  if (numDimensions === 1 && numMeasures === 1) {
    const dimension = dimensions[0];
    const isLowCardinality = dimension.metadata?.cardinality === "low" ||
      (dimension.metadata?.values && dimension.metadata.values.length <= 8);

    if (isLowCardinality) {
      return {
        type: "stacked-bar",
        reason: "Low cardinality dimension - showing composition",
        config: {
          stacked: true,
        },
      };
    }

    return {
      type: "bar",
      reason: "Single categorical dimension with one measure",
      config: {},
    };
  }

  // Rule 8: Multiple dimensions + 1 metric → Stacked bar
  if (numDimensions > 1 && numMeasures === 1) {
    return {
      type: "stacked-bar",
      reason: "Multiple dimensions with one metric - showing breakdown",
      config: {
        stacked: true,
        multiXAxis: true,
      },
    };
  }

  // Default fallback: bar chart
  return {
    type: "bar",
    reason: "Default chart type",
    config: {},
  };
}

/**
 * Get chart title from query
 */
export function generateChartTitle(query: QueryResponse): string {
  const measures = query.measures.map((m) => formatLabel(m)).join(" & ");
  const dimensions = query.dimensions?.map((d) => formatLabel(d)).join(" by ") || "";

  if (dimensions) {
    return `${measures} by ${dimensions}`;
  }
  return measures;
}

/**
 * Format label for display
 */
function formatLabel(text: string): string {
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Ltv/g, "LTV")
    .replace(/30d/g, "(30d)");
}
