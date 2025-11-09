// routes/api/onboarding/complete.ts
import { Handlers } from "$fresh/server.ts";
import { getKv } from "../../../utils/db.ts";
import { getCookies } from "$std/http/cookie.ts";
import ldClient from "../../../utils/launchDarkly.ts";
import { createContext, type PlanTier } from "../../../utils/context.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      // Get user session from cookie
      const cookies = getCookies(req.headers);
      const userSessionId = cookies.user_session;

      if (!userSessionId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Get user session from KV
      const kv = getKv();
      const sessionData = await kv.get(["user_sessions", userSessionId]);

      if (!sessionData?.value) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const userEmail = (sessionData.value as any).email;
      const userName = (sessionData.value as any).name;

      // Get onboarding data from request
      const body = await req.json();
      const { plan } = body;

      // Validate plan tier
      const validPlans: PlanTier[] = ["trial", "starter", "premium"];
      if (!plan || !validPlans.includes(plan)) {
        return new Response(JSON.stringify({ error: "Invalid plan tier" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Update user record with plan selection
      await kv.set(["users", userEmail], {
        email: userEmail,
        name: userName,
        picture: (sessionData.value as any).picture,
        createdAt: (sessionData.value as any).createdAt || Date.now(),
        onboardingCompleted: true,
        onboardingCompletedAt: Date.now(),
        planTier: plan as PlanTier
      });

      // Create LaunchDarkly context for the user
      const ldContext = createContext(userEmail, plan as PlanTier, userEmail, userName);

      // Evaluate feature flags for the user's plan (optional - for immediate feedback)
      const features = {
        advancedAnalytics: await ldClient.variation("advanced-analytics", ldContext, false),
        aiInsights: await ldClient.variation("ai-insights", ldContext, false),
        apiAccess: await ldClient.variation("api-access", ldContext, false),
        unlimitedSources: await ldClient.variation("unlimited-sources", ldContext, false),
        prioritySupport: await ldClient.variation("priority-support", ldContext, false),
      };

      console.log(`Onboarding completed for ${userEmail}: ${plan} plan`);
      console.log(`Features enabled:`, features);

      return new Response(JSON.stringify({
        success: true,
        message: "Onboarding completed successfully",
        planTier: plan,
        features
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("Error completing onboarding:", error);
      return new Response(JSON.stringify({
        error: "Internal server error",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
