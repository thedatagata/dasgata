// routes/api/metadata/get-tables.ts
import { Handlers } from "$fresh/server.ts";
import { getAllTables, getTableMetadata } from "./query-metadata.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const tableName = url.searchParams.get("table");
      
      if (tableName) {
        const metadata = await getTableMetadata(tableName);
        if (!metadata) {
          return new Response(
            JSON.stringify({ error: "Table not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify(metadata), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const tables = await getAllTables();
      return new Response(JSON.stringify(tables), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Failed to get tables:", error);
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
