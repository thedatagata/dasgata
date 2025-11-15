// routes/api/analytics/profile.ts
import { createMotherDuckClient } from "../../../utils/services/motherduck-client.ts";
import { TableProfiler } from "../../../utils/analytics/table-profiler.ts";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
  async POST(_ctx) {
    const req = ctx.req;

    try {
      const { tableName } = await req.json();

      if (!tableName) {
        return new Response(
          JSON.stringify({ error: "Missing tableName" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const token = req.headers.get("X-MotherDuck-Token");
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const client = await createMotherDuckClient(token);
      const location = tableName.startsWith("memory.") ? "memory" : "motherduck";

      const profile = await TableProfiler.profileTable(client, tableName, location);

      return new Response(
        JSON.stringify(profile),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Profile error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Profiling failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
