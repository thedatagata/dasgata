// islands/DashboardRouter.tsx
import { useState } from "preact/hooks";
import PlanSelection from "../onboarding/PlanSelection.tsx";
import BaseDashboard from "../starter_dashboard/BaseDashboard.tsx";
import SmartDashLoadingPage from "./SmartDashLoadingPage.tsx";
import SmartDashboardLandingPage from "../smarter_dashboard/dashboard_landing_view/SmartDashboardLandingPage.tsx";

interface DashboardRouterProps {
  motherDuckToken: string;
  sessionId: string;
}

export default function DashboardRouter({ motherDuckToken, sessionId }: DashboardRouterProps) {
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "smarter" | null>(null);
  const [db, setDb] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  if (!selectedPlan) {
    return <PlanSelection onSelectPlan={setSelectedPlan} />;
  }

  if (selectedPlan === "starter") {
    return (
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
        <nav class="fixed w-full z-50 bg-[#172217]/95 backdrop-blur-sm shadow-lg">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
              <a href="/app/dashboard" class="flex items-center space-x-2">
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
            </div>
          </div>
        </nav>

        <main class="pt-20">
          <BaseDashboard
            motherDuckToken={motherDuckToken}
            sessionId={sessionId}
          />
        </main>
      </div>
    );
  }

  // Smarter plan: Show loading, then dashboard
  if (loading) {
    return (
      <SmartDashLoadingPage
        onComplete={(database, webllmEngine) => {
          setDb(database);
          setLoading(false);
        }}
      />
    );
  }

  return (
    <div class="min-h-screen bg-gray-50">
      <nav class="fixed w-full z-50 bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <a href="/app/dashboard" class="flex items-center space-x-2">
              <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500">
                <img
                  src="/nerdy_alligator_headshot.png"
                  alt="DATA_GATA Logo"
                  class="w-full h-full object-cover"
                />
              </div>
              <span class="text-xl font-bold text-gray-900">
                DATA_<span class="text-blue-600">GATA</span>
              </span>
            </a>
          </div>
        </div>
      </nav>

      <main class="pt-20">
        <SmartDashboardLandingPage db={db} />
      </main>
    </div>
  );
}
