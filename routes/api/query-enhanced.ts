// routes/api/query-enhanced.ts
/**
 * Enhanced Query API Endpoint
 * 
 * This endpoint uses the modular QueryEngine and QueryApprovalSystem
 * to provide a fully-featured query experience with caching and approval
 * 
 * Later, feature flags can be injected here to control behavior
 */

import { Handlers } from "$fresh/server.ts";
import { QueryEngine, createDefaultConfig, type QueryEngineConfig } from "../../utils/query-engine.ts";
import { QueryApprovalSystem, createDefaultApprovalConfig } from "../../utils/query-approval-system.ts";
import { createMotherDuckClient } from "../../utils/motherduck-client.ts";
import type { TableMetadata } from "../../utils/webllm.ts";

// Global instances (in production, these would be per-user or session-scoped)
let queryEngine: QueryEngine | null = null;
let approvalSystem: QueryApprovalSystem | null = null;

/**
 * Initialize services
 * In production, this would check feature flags and user plan
 */
async function initializeServices(
  duckdbClient: any,
  motherDuckToken: string
): Promise<{ engine: QueryEngine; approval: QueryApprovalSystem }> {
  if (!queryEngine) {
    const config = createDefaultConfig();
    const motherDuckClient = await createMotherDuckClient(motherDuckToken);
    queryEngine = new QueryEngine(config, duckdbClient, motherDuckClient);
  }

  if (!approvalSystem) {
    const approvalConfig = createDefaultApprovalConfig();
    approvalSystem = new QueryApprovalSystem(approvalConfig);
  }

  return { engine: queryEngine, approval: approvalSystem };
}

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      const { 
        naturalLanguageQuery, 
        tableName, 
        metadata, 
        duckdbClient, 
        motherDuckToken,
        checkCache = true 
      } = body;

      // Validate inputs
      if (!naturalLanguageQuery || !tableName) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Initialize services
      const { engine, approval } = await initializeServices(duckdbClient, motherDuckToken);

      // Check cache first if enabled
      if (checkCache) {
        const cached = approval.getCachedQuery(naturalLanguageQuery, tableName);
        if (cached) {
          console.log("✅ Returning cached result");
          return new Response(
            JSON.stringify({
              ...cached,
              executed: { ...cached.executed, fromCache: true }
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // Check for similar approved queries
      const similarQueries = await approval.findSimilarQueries(
        naturalLanguageQuery,
        tableName,
        3
      );

      // Execute new query
      const result = await engine.query(naturalLanguageQuery, tableName, metadata);

      // Cache the result
      approval.cacheQuery(result);

      // Return result with similar queries
      return new Response(
        JSON.stringify({
          ...result,
          similarQueries: similarQueries.map(sq => ({
            query: sq.query.naturalLanguageQuery,
            sql: sq.query.sql,
            similarity: sq.similarity,
            executionCount: sq.query.executionCount
          }))
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error("Query error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
