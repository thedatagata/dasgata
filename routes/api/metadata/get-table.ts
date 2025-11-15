import { Handlers } from "fresh/compat";

// routes/api/metadata/get-table.ts
const kv = await Deno.openKv();

export const handler: Handlers = {
  async GET(ctx) {
    const req = ctx.req;

    try {
      const url = new URL(req.url);
      const tableName = url.searchParams.get("tableName");

      if (!tableName) {
        return new Response(
          JSON.stringify({ error: "tableName parameter required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const entry = await kv.get(["table_metadata", tableName]);
      const metadata = entry.value;

      if (metadata) {
        return new Response(
          JSON.stringify(metadata),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "Table not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Get table error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
