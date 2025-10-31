// routes/api/onboarding/complete.ts
import { Handlers } from "$fresh/server.ts";
import { getKv } from "../../../utils/db.ts";
import { getCookies } from "$std/http/cookie.ts";

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

      // Get onboarding data from request
      const { department, metrics, sources } = await req.json();

      // Update user record with onboarding data
      await kv.set(["users", userEmail], {
        email: userEmail,
        name: (sessionData.value as any).name,
        picture: (sessionData.value as any).picture,
        createdAt: (sessionData.value as any).createdAt || Date.now(),
        onboardingCompleted: true,
        onboardingCompletedAt: Date.now(),
        department,
        metrics,
        sources
      });

      console.log(`Onboarding completed for ${userEmail}: ${department}, ${metrics.length} metrics, ${sources.length} sources`);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Onboarding completed successfully"
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
