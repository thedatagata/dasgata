import { Handlers } from "fresh/compat";

// routes/api/metadata/register-table.ts
const kv = await Deno.openKv();

export const handler: Handlers = {
  async POST(ctx) {
    const req = ctx.req;

    try {
      const metadata = await req.json();

      if (!metadata.tableName || !metadata.fullName) {
        return new Response(
          JSON.stringify({ error: "tableName and fullName required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await kv.set(["table_metadata", metadata.fullName], metadata);
      console.log(`📝 Registered table: ${metadata.fullName}`);

      return new Response(
        JSON.stringify({ registered: true }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Register table error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
