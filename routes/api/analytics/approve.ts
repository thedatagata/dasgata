import { Handlers } from "fresh/compat";

// routes/api/analytics/approve.ts
const kv = await Deno.openKv();

export const handler: Handlers = {
  async POST(_ctx) {
    const req = ctx.req;

    try {
      const { question, tableName, queryResponse } = await req.json();

      if (!question || !tableName || !queryResponse) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const userId = req.headers.get("X-User-Id") || "anonymous";
      const cacheKey = `${tableName}:${question.toLowerCase().trim()}`;

      // Store approved query
      await kv.set(
        ["approved_queries", userId, tableName, cacheKey],
        {
          question,
          tableName,
          ...queryResponse,
          approvedAt: new Date().toISOString(),
          approvedBy: userId,
        },
      );

      console.log(`✅ Approved query for ${userId}: ${question}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Approval error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Approval failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  // Get approved queries for a table
  async GET(_ctx) {
    const req = ctx.req;

    try {
      const url = new URL(req.url);
      const tableName = url.searchParams.get("table");
      const userId = req.headers.get("X-User-Id") || "anonymous";

      if (!tableName) {
        return new Response(
          JSON.stringify({ error: "Missing table parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const queries: any[] = [];
      const iter = kv.list({
        prefix: ["approved_queries", userId, tableName],
      });

      for await (const entry of iter) {
        queries.push(entry.value);
      }

      return new Response(
        JSON.stringify({ queries }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Fetch approved queries error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch queries" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
