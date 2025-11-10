import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import DashboardTabs from "../../islands/DashboardTabs.tsx";

interface DashboardData {
  email: string;
  plan: string;
  motherDuckToken: string;
}

export const handler: Handlers<DashboardData> = {
  async GET(req, ctx) {
    // Get from session/state
    const email = ctx.state.email || "user@example.com";
    const plan = ctx.state.plan || "trial";
    
    return ctx.render({
      email,
      plan,
      motherDuckToken: Deno.env.get("MOTHERDUCK_TOKEN") || "",
    });
  },
};

export default function Dashboard({ data }: PageProps<DashboardData>) {
  return (
    <>
      <Head>
        <title>Dashboard | DATA_GATA</title>
      </Head>
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Plan Badge */}
          <div class="mb-6 flex justify-between items-center">
            <h1 class="text-3xl font-bold text-[#F8F6F0]">Analytics Dashboard</h1>
            <div class="px-4 py-2 bg-[#90C137] text-[#172217] rounded-lg font-semibold">
              {data.plan.toUpperCase()} Plan
            </div>
          </div>
          
          <DashboardTabs 
            motherDuckToken={data.motherDuckToken}
            plan={data.plan}
            email={data.email}
          />
        </div>
      </div>
    </>
  );
}
