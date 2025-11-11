// routes/api/query.ts
import { Handlers } from "$fresh/server.ts";
// TODO: Re-enable after LaunchDarkly implementation
// import { getLDClient, trackEvent } from '../../utils/launchdarkly.ts';
import {
  getCachedQuery,
  cacheQuery,
  getQueryConnection,
  getTableMetadata,
  getQueryHash,
} from "../../utils/query-metadata.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    // TODO: Re-enable LaunchDarkly checks
    // const ldContext = ctx.state.ldContext;
    // const ldClient = getLDClient();
    // const hasAIAccess = await ldClient.variation("ai-query-access", ldContext, false);
    // if (!hasAIAccess) {
    //   return new Response("Upgrade to access AI features", { status: 403 });
    // }
    
    try {
      const { query, skipCache = false, connection } = await req.json();
      
      if (!query || typeof query !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid query" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Check cache first (unless skipped)
      if (!skipCache) {
        const cached = await getCachedQuery(query);
        if (cached) {
          // await trackEvent(ldContext, 'query-cache-hit', { queryHash: getQueryHash(query) });
          
          return new Response(
            JSON.stringify({
              results: cached.results,
              cached: true,
              queryHash: getQueryHash(query),
              executionTime: cached.executionTime,
              timestamp: cached.timestamp,
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
      }
      
      // Extract table names from query
      const tablePattern = /FROM\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi;
      const matches = [...query.matchAll(tablePattern)];
      const tableNames = matches.map(m => m[1].split('.').pop() || m[1]);
      
      // Determine connection based on table registry or explicit connection param
      const queryConnection = connection || await getQueryConnection(tableNames);
      
      // Get table metadata for context
      const tableMeta = tableNames.length > 0 
        ? await getTableMetadata(tableNames[0]) 
        : null;
      
      console.log(`🔍 Executing query on ${queryConnection.location}${queryConnection.database ? `:${queryConnection.database}` : ''}`);
      console.log(`📊 Tables: ${tableNames.join(', ')}`);
      
      // await trackEvent(ldContext, 'query-executed', { location: queryConnection.location, database: queryConnection.database, tableCount: tableNames.length });
      
      // Return connection info for client-side execution
      return new Response(
        JSON.stringify({
          queryHash: getQueryHash(query),
          connection: queryConnection,
          tableMetadata: tableMeta,
          tableNames,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Query execution failed:", error);
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
