// utils/semantic/config.ts
import semanticConfig from "../../static/semantic-layer.json" with { type: "json" };

export interface SemanticConfig {
  version: number;
  sessions: ModelConfig;
  users: ModelConfig;
  charts: Record<string, ChartConfig>;
}

export interface ModelConfig {
  table: string;
  description: string;
  dimensions: Record<string, DimensionConfig>;
  measures: Record<string, MeasureConfig>;
}

export interface DimensionConfig {
  column?: string;
  sql?: string;
  type: string;
  description: string;
  cardinality?: string;
  values?: string[];
  is_time_dimension?: boolean;
}

export interface MeasureConfig {
  aggregation: string;
  description: string;
  format: string;
  decimals?: number;
  currency?: string;
  unit?: string;
}

export interface ChartConfig {
  model: string;
  type: string;
  title: string;
  description?: string;
  dimensions?: string[];
  measures?: string[];
}

export function getSemanticConfig(): SemanticConfig {
  return semanticConfig as SemanticConfig;
}

export function getModelConfig(modelName: "sessions" | "users"): ModelConfig {
  return semanticConfig[modelName] as ModelConfig;
}

export function getChartConfig(chartName: string): ChartConfig | undefined {
  return semanticConfig.charts?.[chartName] as ChartConfig;
}

// Optimized for 3B model - shorter, more focused prompt
export function generateWebLLMPrompt(): string {
  const config = getSemanticConfig();
  
  return `You are a data analyst. Generate query specs in JSON format ONLY.

# Sessions Table (${config.sessions.table})
Dimensions: ${Object.keys(config.sessions.dimensions).join(', ')}
Measures: ${Object.keys(config.sessions.measures).join(', ')}
Use cookie_id for unique counts (97% anonymous).

# Users Table (${config.users.table})
Dimensions: ${Object.keys(config.users.dimensions).join(', ')}
Measures: ${Object.keys(config.users.measures).join(', ')}
Use user_key for unique counts (97.65% anonymous).

# Response Format (CRITICAL - JSON ONLY, NO MARKDOWN)
{
  "table": "sessions" | "users",
  "dimensions": ["dim1"],
  "measures": ["measure1"],
  "filters": ["filter"],
  "explanation": "what this shows"
}

# Examples
"conversion rate by source" → {"table":"sessions","dimensions":["traffic_source"],"measures":["conversion_rate"],"explanation":"Conversion rates by traffic source"}

"active users by plan" → {"table":"users","dimensions":["current_plan_tier"],"measures":["active_users"],"filters":["current_plan_tier != ''"],"explanation":"Active users by subscription tier"}

"revenue over time" → {"table":"sessions","dimensions":["session_date"],"measures":["total_revenue"],"explanation":"Revenue trends over time"}`;
}