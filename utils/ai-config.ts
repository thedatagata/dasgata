// utils/ai-config.ts
import { getLDClient } from "./launchdarkly.ts";
import type { LDContext, LDMultiKindContext } from "@launchdarkly/node-server-sdk";

export interface AIConfigModel {
  enabled: boolean;
  name?: string;
  modelId?: string;
  parameters?: Record<string, unknown>;
}

export interface AIConfig {
  provider: string;
  model: AIConfigModel;
  promptTemplate?: string;
  maxTokens?: number;
  temperature?: number;
}

// Get AI Config from LaunchDarkly
export async function getAIConfig(
  context: LDContext | LDMultiKindContext
): Promise<AIConfig> {
  const client = getLDClient();
  
  const defaultConfig: AIConfig = {
    provider: "motherduck-ai",
    model: {
      enabled: true,
      name: "gpt-4",
      modelId: "gpt-4-turbo"
    },
    maxTokens: 1000,
    temperature: 0.7
  };

  return await client.variation("ai-config", context, defaultConfig);
}

// AI provider implementations
export async function executeMotherDuckQuery(
  query: string,
  config: AIConfig
): Promise<{ result: string; latency: number; tokensUsed?: number }> {
  const start = performance.now();
  
  try {
    // Call MotherDuck AI endpoint
    const response = await fetch("https://api.motherduck.com/ai/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("MOTHERDUCK_TOKEN")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        model: config.model.modelId || "gpt-4-turbo",
        max_tokens: config.maxTokens,
        temperature: config.temperature
      })
    });

    const data = await response.json();
    const latency = performance.now() - start;

    return {
      result: data.result,
      latency,
      tokensUsed: data.usage?.total_tokens
    };
  } catch (error) {
    console.error("MotherDuck AI error:", error);
    throw error;
  }
}

export async function executeWebLLMQuery(
  query: string,
  config: AIConfig
): Promise<{ result: string; latency: number }> {
  const start = performance.now();
  
  try {
    // WebLLM runs client-side, so this would be a placeholder
    // In real implementation, this would proxy to a client-side execution
    const response = await fetch("/api/webllm/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        model: config.model.modelId || "Llama-3.2-3B-Instruct-q4f16_1-MLC",
        max_tokens: config.maxTokens,
        temperature: config.temperature
      })
    });

    const data = await response.json();
    const latency = performance.now() - start;

    return {
      result: data.result,
      latency
    };
  } catch (error) {
    console.error("WebLLM error:", error);
    throw error;
  }
}

// Execute query based on AI Config
export async function executeAIQuery(
  query: string,
  context: LDContext | LDMultiKindContext
): Promise<{
  result: string;
  latency: number;
  provider: string;
  tokensUsed?: number;
  cost?: number;
}> {
  const config = await getAIConfig(context);
  
  let response;
  if (config.provider === "motherduck-ai") {
    response = await executeMotherDuckQuery(query, config);
  } else if (config.provider === "webllm") {
    response = await executeWebLLMQuery(query, config);
  } else {
    throw new Error(`Unknown provider: ${config.provider}`);
  }

  // Calculate estimated cost (rough estimates)
  let cost: number | undefined;
  if (config.provider === "motherduck-ai" && response.tokensUsed) {
    // GPT-4-turbo: ~$10/1M tokens input, ~$30/1M tokens output
    cost = (response.tokensUsed / 1_000_000) * 20; // Average of $20/1M tokens
  } else if (config.provider === "webllm") {
    cost = 0; // Client-side is free
  }

  return {
    ...response,
    provider: config.provider,
    cost
  };
}