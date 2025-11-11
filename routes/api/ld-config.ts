// routes/api/ld-config.ts
import { Handlers } from "$fresh/server.ts";
import { getLDClient } from "../../utils/launchdarkly.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    const sessionId = ctx.state.sessionId;
    
    try {
      const client = getLDClient();
      
      const context = {
        kind: "user",
        key: sessionId
      };
      
      const config = await client.variation(
        "analytics-experience",
        context,
        { model: "Llama-3.1-8B-Instruct-q4f32_1-MLC" }
      );
      
      return new Response(
        JSON.stringify(config),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("LD config error:", error);
      return new Response(
        JSON.stringify({ model: "Llama-3.1-8B-Instruct-q4f32_1-MLC" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }
};