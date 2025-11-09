// routes/api/ai-query.ts
import { Handlers } from "$fresh/server.ts";
import { AppState } from "../../middleware/launchdarkly.ts";
import { executeAIQuery } from "../../utils/ai-config.ts";
import { trackEvent } from "../../utils/launchdarkly.ts";

interface AIQueryRequest {
  query: string;
}

interface AIQueryResponse {
  result: string;
  provider: string;
  latency: number;
  tokensUsed?: number;
  cost?: number;
}

export const handler: Handlers<AIQueryResponse, AppState> = {
  async POST(req, ctx) {
    const { ldContext } = ctx.state;
    
    try {
      const { query }: AIQueryRequest = await req.json();
      
      if (!query || query.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Query is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Track query start
      trackEvent("ai-query-started", ldContext, { query });

      // Execute query using AI Config
      const result = await executeAIQuery(query, ldContext);

      // Track query completion with metrics
      trackEvent("ai-query-completed", ldContext, {
        provider: result.provider,
        query,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        success: true
      }, result.latency);

      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );

    } catch (error) {
      console.error("AI query error:", error);
      
      // Track failure
      trackEvent("ai-query-failed", ldContext, {
        error: error.message
      });

      return new Response(
        JSON.stringify({ 
          error: "Query execution failed",
          details: error.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};