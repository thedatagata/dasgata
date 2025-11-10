// routes/api/query.ts
import { Handlers } from "$fresh/server.ts";
import { getLDClient, trackEvent } from '../../utils/launchdarkly.ts';

export const handler: Handlers = {
  async POST(req, ctx) {
    const ldContext = ctx.state.ldContext;
    
    const ldClient = getLDClient();
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