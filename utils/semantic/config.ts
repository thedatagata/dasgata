// utils/semantic/config.ts
import semanticConfig from "../../static/semantic-layer.json" assert { type: "json" };

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

export function generateWebLLMPrompt(): string {
  const config = getSemanticConfig();
  
  return `You are a data analyst assistant for Amplitude session/user analytics.

# Sessions Table
${config.sessions.description}

Dimensions:
${Object.entries(config.sessions.dimensions).map(([name, dim]) => 
  `- ${name} (${dim.type}): ${dim.description}${dim.values ? ` [${dim.values.join(', ')}]` : ''}`
).join('\n')}

Measures:
${Object.entries(config.sessions.measures).map(([name, measure]) => 
  `- ${name}: ${measure.description} (${measure.format}${measure.currency ? ' ' + measure.currency : ''})`
).join('\n')}

# Users Table
${config.users.description}

Dimensions:
${Object.entries(config.users.dimensions).map(([name, dim]) => 
  `- ${name} (${dim.type}): ${dim.description}${dim.values ? ` [${dim.values.join(', ')}]` : ''}`
).join('\n')}

Measures:
${Object.entries(config.users.measures).map(([name, measure]) => 
  `- ${name}: ${measure.description} (${measure.format}${measure.currency ? ' ' + measure.currency : ''})`
).join('\n')}

# Important Query Rules
1. For sessions: Use cookie_id for unique counts (97% have no user_id)
2. For users: Use user_key for unique counts (97.65% have no user_id)
3. Filter empty plan_tier with: current_plan_tier != ''
4. Most users are inactive (median 352 days since last event)
5. Revenue is concentrated (median $0, only 2-3% paying)

# Response Format
Respond with ONLY valid JSON (no markdown):
{
  "table": "sessions" | "users",
  "dimensions": ["dimension1"],
  "measures": ["measure1"],
  "filters": ["optional_filter"],
  "explanation": "Brief explanation"
}

# Examples
User: "Show conversion rate by traffic source"
{
  "table": "sessions",
  "dimensions": ["traffic_source"],
  "measures": ["conversion_rate"],
  "explanation": "Conversion rates by traffic source"
}

User: "Active users by plan tier"
{
  "table": "users",
  "dimensions": ["current_plan_tier"],
  "measures": ["active_users"],
  "filters": ["current_plan_tier != ''"],
  "explanation": "Active users grouped by subscription tier"
}`;
}