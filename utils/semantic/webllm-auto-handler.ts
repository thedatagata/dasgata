// utils/semantic/webllm-handler-auto.ts
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { generateWebLLMPrompt, getSemanticConfig } from "./config.ts";
import { autoGeneratePlotlyChart } from "./plotly-auto-generator.ts";
import type { SemanticTable } from "./semantic-amplitude.ts";
import type { ChartDetectionResult } from "./chart-detector.ts";

export interface QueryResponse {
  table: "sessions" | "users";
  dimensions: string[];
  measures: string[];
  filters?: string[];
  explanation: string;
}

export interface QueryWithChartResponse {
  query: QueryResponse;
  data: any[];
  plotlyConfig: any;
  chartDetection: ChartDetectionResult;
}

export class WebLLMSemanticHandler {
  private engine: any;
  private systemPrompt: string;
  private modelId: string;
  private semanticConfig: any;

  // Model tier options
  private static MODEL_TIERS = {
    small: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC",
    medium: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    large: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC"
  };

  constructor(
    private semanticTables: { sessions: SemanticTable; users: SemanticTable },
    tier: 'small' | 'medium' | 'large' = 'medium'
  ) {
    this.modelId = WebLLMSemanticHandler.MODEL_TIERS[tier];
    this.systemPrompt = generateWebLLMPrompt();
    this.semanticConfig = getSemanticConfig();
  }

  async initialize(onProgress?: (progress: any) => void) {
    this.engine = await CreateMLCEngine(this.modelId, {
      initProgressCallback: (progress) => {
        console.log("Loading WebLLM:", progress);
        onProgress?.(progress);
      }
    });
  }

  /**
   * Generate query, execute it, and automatically create chart
   * This is the main method to use - mimics Boring Semantic Layer workflow
   */
  async generateQueryWithChart(userPrompt: string): Promise<QueryWithChartResponse> {
    // Step 1: Generate query spec from natural language
    const { query, data } = await this.generateQuery(userPrompt);

    // Step 2: Automatically detect chart type and generate config (BSL-style)
    const { plotlyConfig, detection } = autoGeneratePlotlyChart(
      query,
      data,
      this.semanticConfig
    );

    return {
      query,
      data,
      plotlyConfig,
      chartDetection: detection
    };
  }

  /**
   * Generate query only (no chart)
   */
  async generateQuery(userPrompt: string): Promise<{
    query: QueryResponse;
    data: any[];
  }> {
    const completion = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: userPrompt + "\n\nRemember: Respond with ONLY valid JSON, no markdown." }
      ],
      temperature: 0.0,
      max_tokens: 300
    });

    const responseText = completion.choices[0].message.content;
    
    // Aggressive markdown stripping and JSON extraction
    let querySpec: QueryResponse;
    try {
      const cleanedText = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^[^{]*/, "")
        .replace(/[^}]*$/, "")
        .trim();
      
      querySpec = JSON.parse(cleanedText);
      
      // Validate required fields
      if (!querySpec.table || !querySpec.measures || !Array.isArray(querySpec.measures)) {
        throw new Error("Invalid query spec structure: missing table or measures");
      }

      querySpec.dimensions = querySpec.dimensions || [];
      
    } catch (error) {
      console.error("Raw LLM response:", responseText);
      throw new Error(`Failed to parse WebLLM response: ${error.message}`);
    }

    // Validate dimensions/measures exist in semantic layer
    const table = this.semanticTables[querySpec.table];
    const metadata = table.getMetadata();
    
    querySpec.dimensions?.forEach(dim => {
      if (!metadata.dimensions[dim]) {
        throw new Error(`Unknown dimension: ${dim}. Available: ${Object.keys(metadata.dimensions).join(', ')}`);
      }
    });
    
    querySpec.measures?.forEach(measure => {
      if (!metadata.measures[measure]) {
        throw new Error(`Unknown measure: ${measure}. Available: ${Object.keys(metadata.measures).join(', ')}`);
      }
    });

    // Execute query using semantic layer
    const data = await table.query({
      dimensions: querySpec.dimensions,
      measures: querySpec.measures,
      filters: querySpec.filters
    });

    return { query: querySpec, data };
  }

  getModelInfo() {
    return {
      modelId: this.modelId,
      tier: Object.entries(WebLLMSemanticHandler.MODEL_TIERS)
        .find(([_, id]) => id === this.modelId)?.[0] || 'unknown'
    };
  }
}