// routes/api/metadata/stats.ts
import { Handlers } from "$fresh/server.ts";
import { getStats } from "../../../utils/query-metadata.ts";

export const handler: Handlers = {
  async GET() {
    try {
      const stats = await getStats();
      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
