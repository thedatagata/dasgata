import { PageProps, Handlers } from "$fresh/server.ts";
import SmartDashboardApp from "../../islands/smarter_dashboard/dashboard_landing_view/SessionDashboard.tsx";

export const handler: Handlers = {
  async GET(req, ctx) {
    const motherDuckToken = Deno.env.get("MOTHERDUCK_TOKEN") || "";
    
    if (!motherDuckToken) {
      return ctx.render({ error: "MOTHERDUCK_TOKEN not configured" });
    }
    
    return ctx.render({ motherDuckToken });
  }
};

export default function SessionDashboard({ data }: PageProps) {
  if (data?.error) {
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

  return <SmartDashboardApp />;
}
