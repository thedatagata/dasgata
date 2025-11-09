import { Handlers } from "$fresh/server.ts";
import { getKv } from "../../../utils/db.ts";

interface OnboardingData {
  plan: string;
  completedAt: string;
}

export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      const { plan } = await req.json();
      
      if (!plan) {
        return new Response(
          JSON.stringify({ error: "Plan is required" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const userId = ctx.state.email || "anonymous";
      
      const kv = getKv();
      const onboardingData: OnboardingData = {
        plan,
        completedAt: new Date().toISOString()
      };
      
      await kv.set(["onboarding", userId], onboardingData);

      console.log(`Onboarding completed for ${userId} with plan: ${plan}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          plan,
          redirectUrl: "/app/loading"
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
      
    } catch (error) {
      console.error("Onboarding completion error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to complete onboarding",
          message: error instanceof Error ? error.message : String(error)
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};