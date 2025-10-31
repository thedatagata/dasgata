// routes/app/dashboard.tsx
import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";
import { getCookies } from "$std/http/cookie.ts";

interface DashboardData {
  user: {
    name: string;
    email: string;
    department: string;
    metrics: string[];
    sources: string[];
  };
}

export const handler: Handlers<DashboardData> = {
  async GET(req, ctx) {
    const cookies = getCookies(req.headers);
    const userSessionId = cookies.user_session;

    if (!userSessionId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" }
      });
    }

    const kv = getKv();
    const sessionData = await kv.get(["user_sessions", userSessionId]);
    
    if (!sessionData?.value) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" }
      });
    }

    const userEmail = (sessionData.value as any).email;
    const userData = await kv.get(["users", userEmail]);

    if (!userData?.value) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/onboarding/department" }
      });
    }

    const user = userData.value as any;

    if (!user.onboardingCompleted) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/onboarding/department" }
      });
    }

    return ctx.render({
      user: {
        name: user.name,
        email: user.email,
        department: user.department || "Unknown",
        metrics: user.selectedMetrics || [],
        sources: user.selectedSources || []
      }
    });
  }
};

export default function Dashboard({ data }: PageProps<DashboardData>) {
  return (
    <>
      <Head>
        <title>Dashboard | DATA_GATA</title>
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-4xl font-bold text-gray-900 mb-8">
            Welcome, {data.user.name}!
          </h1>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl p-6 shadow-lg">
              <h2 class="text-xl font-bold text-gray-900 mb-4">Your Profile</h2>
              <dl class="space-y-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500">Email</dt>
                  <dd class="text-gray-900">{data.user.email}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Department</dt>
                  <dd class="text-gray-900">{data.user.department}</dd>
                </div>
              </dl>
            </div>
            
            <div class="bg-white rounded-xl p-6 shadow-lg">
              <h2 class="text-xl font-bold text-gray-900 mb-4">Selected Metrics</h2>
              <ul class="space-y-2">
                {data.user.metrics.map((metric) => (
                  <li key={metric} class="text-gray-900">• {metric}</li>
                ))}
              </ul>
            </div>
            
            <div class="bg-white rounded-xl p-6 shadow-lg md:col-span-2">
              <h2 class="text-xl font-bold text-gray-900 mb-4">Connected Sources</h2>
              <div class="flex flex-wrap gap-2">
                {data.user.sources.map((source) => (
                  <span key={source} class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
