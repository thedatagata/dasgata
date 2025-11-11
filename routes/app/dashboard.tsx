import { PageProps, Handlers } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";
import SmartDashboard from "../../islands/SmartDashboard.tsx";

interface DashboardData {
  motherDuckToken: string;
  planTier: "base" | "premium";
  sessionId: string;
}

export const handler: Handlers<DashboardData> = {
  async GET(req, ctx) {
    const motherDuckToken = Deno.env.get("MOTHERDUCK_TOKEN") || "";
    const sessionId = ctx.state.sessionId;
    
    const kv = getKv();
    const planData = await kv.get(["user_plan", sessionId]);
    const planTier = (planData.value?.plan as "base" | "premium") || "base";
    
    return ctx.render({ 
      motherDuckToken, 
      planTier,
      sessionId 
    });
  }
};

export default function DashboardPage({ data }: PageProps<DashboardData>) {
  const { motherDuckToken, planTier, sessionId } = data;

  if (!motherDuckToken) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018] p-8">
        <div class="max-w-2xl mx-auto">
          <div class="bg-[#90C137]/10 border-2 border-[#90C137] rounded-lg p-6">
            <h2 class="font-bold text-[#90C137] text-2xl">Configuration Required</h2>
            <p class="text-[#F8F6F0]/90 mt-2">
              Please set the MOTHERDUCK_TOKEN environment variable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
      <nav class="fixed w-full z-50 bg-[#172217]/95 backdrop-blur-sm shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <a href="/" class="flex items-center space-x-2">
              <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-[#90C137]">
                <img 
                  src="/nerdy_alligator_headshot.png" 
                  alt="DATA_GATA Logo" 
                  class="w-full h-full object-cover"
                />
              </div>
              <span class="text-xl font-bold text-[#F8F6F0]">
                DATA_<span class="text-[#90C137]">GATA</span>
              </span>
            </a>
            
            <div class="flex items-center space-x-4">
              <span class="text-[#F8F6F0]/70 text-sm">
                {planTier === "premium" ? "Premium Plan" : "Base Plan"}
              </span>
              <a 
                href="/" 
                class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors text-sm font-medium"
              >
                ← Back
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main class="pt-20">
        <SmartDashboard 
          motherDuckToken={motherDuckToken} 
          planTier={planTier}
          sessionId={sessionId}
        />
      </main>
    </div>
  );
}
