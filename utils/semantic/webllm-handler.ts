// utils/semantic/webllm-handler.ts
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { generateWebLLMPrompt } from "./config.ts";
import type { SemanticTable } from "./semantic-amplitude.ts";

export interface QueryResponse {
  table: "sessions" | "users";
  dimensions: string[];
  measures: string[];
  filters?: string[];
  explanation: string;
}

export class WebLLMSemanticHandler {
  private engine: any;
  private systemPrompt: string;

  constructor(
    private semanticTables: { sessions: SemanticTable; users: SemanticTable },
    private modelId: string = "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC"
  ) {
    this.systemPrompt = generateWebLLMPrompt();
  }

  async initialize(onProgress?: (progress: any) => void) {
    this.engine = await CreateMLCEngine(this.modelId, {
      initProgressCallback: (progress) => {
        console.log("Loading WebLLM:", progress);
        onProgress?.(progress);
      }
    });
  }

  async generateQuery(userPrompt: string): Promise<{
    query: QueryResponse;
    data: any[];
  }> {
    const completion = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content;
    
    // Parse JSON response (strip markdown if present)
    let querySpec: QueryResponse;
    try {
      const cleanedText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      querySpec = JSON.parse(cleanedText);
    } catch (error) {
      throw new Error(`Failed to parse WebLLM response: ${responseText}`);
    }

    // Execute query using semantic layer
    const table = this.semanticTables[querySpec.table];
    const data = await table.query({
      dimensions: querySpec.dimensions,
      measures: querySpec.measures,
      filters: querySpec.filters
    });

    return { query: querySpec, data };
  }

  async suggestVisualization(querySpec: QueryResponse, data: any[]) {
    const vizPrompt = `Given this query result:
Table: ${querySpec.table}
Dimensions: ${querySpec.dimensions.join(', ')}
Measures: ${querySpec.measures.join(', ')}
Row count: ${data.length}

Suggest the best Plotly chart type and configuration. Respond with JSON only:
{
  "type": "bar|line|scatter|funnel|pie",
  "x": "column_name",
  "y": "column_name",
  "color": "optional_column",
  "title": "Chart title",
  "reason": "Why this chart type"
}`;

    const completion = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: vizPrompt }
      ],
      temperature: 0.2,
      max_tokens: 300
    });

    const responseText = completion.choices[0].message.content;
    const cleanedText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    return JSON.parse(cleanedText);
  }
}