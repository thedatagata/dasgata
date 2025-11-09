// routes/api/query.ts
import { Handlers } from "$fresh/server.ts";
import ldClient from "../../utils/launchdarkly.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const ldContext = ctx.state.ldContext;
    
    // Check if user has access to AI queries
    const hasAIAccess = await ldClient.variation(
      "ai-query-access",
      ldContext,
      false
    );
    
    if (!hasAIAccess) {
      return new Response("Upgrade to access AI features", { status: 403 });
    }
    
    // ... rest of handler
  },
};