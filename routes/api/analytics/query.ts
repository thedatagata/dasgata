// routes/api/analytics/query.ts
import { Handlers } from "$fresh/server.ts";
import { createMotherDuckClient } from "../../../utils/motherduck-client.ts";
import { UnifiedQueryService } from "../../../utils/analytics/unified-query-service.ts";

export const handler: Handlers = {
  async POST(req, _ctx) {
    try {
      const { question, tableName, userId } = await req.json();
      
      if (!question || !tableName) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Get MotherDuck token from auth
      const token = req.headers.get("X-MotherDuck-Token");
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Create client and service
      const client = await createMotherDuckClient(token);
      const queryService = new UnifiedQueryService(client);
      
      // Execute query
      const response = await queryService.executeQuery({
        question,
        tableName,
        userId
      });
      
      return new Response(
        JSON.stringify(response),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Query execution error:", error);
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Query failed" 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
