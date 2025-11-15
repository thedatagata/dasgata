// utils/semantic/recharts-generator.ts
import type { QueryResponse } from "./webllm-handler.ts";
import type { SemanticConfig } from "./semantic_config.ts";
import { detectChartType } from "./chart-detector.ts";

export interface RechartsConfig {
  type: "bar" | "line" | "funnel" | "area" | "heatmap";
  title: string;
  xKey: string;
  yKeys: string[];
  data: any[];
  config: {
    colors?: string[];
    stacked?: boolean;
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    orientation?: "horizontal" | "vertical";
    isTimeSeries?: boolean;
    format?: {
      [key: string]: {
        type: "currency" | "percentage" | "number";
        decimals?: number;
      };
    };
  };
}

const COLOR_PALETTE = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
  "#ffa07a",
];

/**
 * Generate Recharts configuration from semantic layer query
 */
export function generateRechartsConfig(
  query: QueryResponse,
  data: any[],
  semanticConfig: SemanticConfig,
): RechartsConfig {
  const detection = detectChartType(query, semanticConfig);
  const modelConfig = semanticConfig[query.table];

  // Determine x-axis (dimension or index)
  const xKey = query.dimensions?.[0] || "index";
  const yKeys = query.measures || [];

  // Format data for Recharts
  const formattedData = data.map((row, idx) => ({
    ...row,
    index: idx,
  }));

  // Get measure formatting
  const format: any = {};
  yKeys.forEach((measure) => {
    const measureConfig = modelConfig.measures[measure];
    if (measureConfig) {
      format[measure] = {
        type: measureConfig.format as "currency" | "percentage" | "number",
        decimals: measureConfig.decimals || 0,
      };
    }
  });

  // Check if time series
  const isTimeSeries = query.dimensions?.[0]?.includes("date") ||
    query.dimensions?.[0]?.includes("time") ||
    modelConfig.dimensions[query.dimensions?.[0] || ""]?.is_time_dimension;

  // Generate title
  const title = generateChartTitle(query, modelConfig);

  return {
    type: detection.type,
    title,
    xKey,
    yKeys,
    data: formattedData,
    config: {
      colors: COLOR_PALETTE.slice(0, yKeys.length),
      stacked: detection.config?.barmode === "stack",
      showLegend: yKeys.length > 1,
      showGrid: true,
      showTooltip: true,
      orientation: detection.config?.orientation === "h" ? "horizontal" : "vertical",
      isTimeSeries,
      format,
    },
  };
}

/**
 * Generate chart title from query
 */
function generateChartTitle(query: QueryResponse, modelConfig: any): string {
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

/**
 * Format value based on type
 */
export function formatValue(
  value: number | string | null | undefined,
  format?: { type: "currency" | "percentage" | "number"; decimals?: number },
): string {
  console.log("formatValue called:", { value, valueType: typeof value, format });

  if (value === null || value === undefined) return "N/A";

  // Handle BigInt
  let numValue: number;
  if (typeof value === "bigint") {
    console.log("Converting BigInt to Number:", value);
    numValue = Number(value);
  } else {
    numValue = typeof value === "string" ? parseFloat(value) : value;
  }

  if (isNaN(numValue)) {
    console.warn("Value is NaN, returning as string:", value);
    return String(value);
  }

  console.log("Numeric value:", numValue, "Format type:", format?.type);

  if (!format) {
    return numValue.toLocaleString();
  }

  const decimals = format.decimals ?? 0;

  // Abbreviate large numbers for currency and number types
  if (format.type === "currency" || format.type === "number") {
    if (Math.abs(numValue) >= 1e12) {
      const abbreviated = numValue / 1e12;
      return format.type === "currency"
        ? `$${abbreviated.toFixed(1)}T`
        : `${abbreviated.toFixed(1)}T`;
    } else if (Math.abs(numValue) >= 1e9) {
      const abbreviated = numValue / 1e9;
      return format.type === "currency"
        ? `$${abbreviated.toFixed(1)}B`
        : `${abbreviated.toFixed(1)}B`;
    } else if (Math.abs(numValue) >= 1e6) {
      const abbreviated = numValue / 1e6;
      return format.type === "currency"
        ? `$${abbreviated.toFixed(1)}M`
        : `${abbreviated.toFixed(1)}M`;
    }
  }

  switch (format.type) {
    case "currency":
      return `$${
        numValue.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      }`;
    case "percentage":
      return `${numValue.toFixed(decimals)}%`;
    case "number":
    default:
      return numValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  }
}

/**
 * Auto-generate Recharts config with chart detection
 */
export function autoGenerateRechartsChart(
  query: QueryResponse,
  data: any[],
  semanticConfig: SemanticConfig,
): {
  rechartsConfig: RechartsConfig;
  detection: any;
} {
  const rechartsConfig = generateRechartsConfig(query, data, semanticConfig);
  const detection = detectChartType(query, semanticConfig);

  return {
    rechartsConfig,
    detection,
  };
}
