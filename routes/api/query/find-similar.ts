// routes/api/query/find-similar.ts
import { Handlers } from "$fresh/server.ts";
import { findSimilar } from "../../../utils/analytics/text-similarity.ts";

const kv = await Deno.openKv();

export const handler: Handlers = {
  async POST(req) {
    try {
      const { prompt, threshold = 0.5, tableName } = await req.json();
      
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "Prompt required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get approved queries for the table
      const approvedQueries: string[] = [];
      const prefix = tableName 
        ? ["approved_queries", tableName]
        : ["approved_queries"];
        
      const iter = kv.list({ prefix });
      for await (const entry of iter) {
        const data = entry.value as any;
        approvedQueries.push(data.question);
      }

      if (approvedQueries.length === 0) {
        return new Response(
          JSON.stringify({ found: false, message: "No approved queries yet" }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Find similar using simple text similarity
      const similar = findSimilar(prompt, approvedQueries, threshold, 3);

      if (similar.length > 0) {
        return new Response(
          JSON.stringify({
            found: true,
            matches: similar
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ found: false }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Find similar error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
