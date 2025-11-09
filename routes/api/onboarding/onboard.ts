// routes/onboard.tsx (or API route)
import { Handlers, HandlerContext } from "$fresh/server.ts";
import ldClient from "../../../utils/launchDarkly.ts";
import { createContext, PlanTier } from "../../../utils/context.ts";

export const handler: Handlers = {
  async POST(req: Request, ctx: HandlerContext) {
    const { planTier, userId } = await req.json();
    
    // Store plan in session/cookie/DB
    // For demo, use cookie:
    const headers = new Headers();
    headers.set("Set-Cookie", `planTier=${planTier}; Path=/; HttpOnly`);
    headers.set("Set-Cookie", `userId=${userId}; Path=/; HttpOnly`);
    
    // Create LD context
    const context = createContext(userId, planTier);
    
    // Evaluate which features are available (optional - for immediate feedback)
    const hasAdvancedAnalytics = await ldClient.variation(
      "advanced-analytics-access",
      context,
      false
    );
    
    return new Response(JSON.stringify({ success: true, hasAdvancedAnalytics }), {
      headers,
    });
  },
};