// islands/tabs/SessionsTab.tsx
import { useEffect, useState } from "preact/hooks";
import KPICard from "../../../components/charts/KPICard.tsx";
import RechartsWrapper from "../../../components/charts/RechartsWrapper.tsx";
import { createSemanticTables } from "../../../utils/semantic/semantic-amplitude.ts";
import { generateRechartsConfig } from "../../../utils/semantic/recharts-generator.ts";
import { getSemanticConfig } from "../../../utils/semantic/semantic_config.ts";

interface SessionsTabProps {
  db: any;
}

export default function SessionsTab({ db }: SessionsTabProps) {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<any>({});
  const [charts, setCharts] = useState<any>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const tables = createSemanticTables(db);
      const semanticConfig = getSemanticConfig();

      try {
        // KPIs with period-over-period comparison
        const currentPeriodFilter = "session_date >= CURRENT_DATE - INTERVAL '30 days'";
        const previousPeriodFilter =
          "session_date >= CURRENT_DATE - INTERVAL '60 days' AND session_date < CURRENT_DATE - INTERVAL '30 days'";

        // Current period KPIs
        const currentRevenue = await tables.sessions.query({
          measures: ["total_revenue"],
          filters: [currentPeriodFilter],
        });

        const previousRevenue = await tables.sessions.query({
          measures: ["total_revenue"],
          filters: [previousPeriodFilter],
        });

        const currentVisitors = await tables.sessions.query({
          measures: ["unique_visitors", "new_sessions", "returning_sessions"],
          filters: [currentPeriodFilter],
        });

        const previousVisitors = await tables.sessions.query({
          measures: ["unique_visitors", "new_sessions", "returning_sessions"],
          filters: [previousPeriodFilter],
        });

        const currentConversion = await tables.sessions.query({
          measures: ["conversion_rate"],
          filters: [currentPeriodFilter],
        });

        const previousConversion = await tables.sessions.query({
          measures: ["conversion_rate"],
          filters: [previousPeriodFilter],
        });

        setKpiData({
          revenue: {
            current: currentRevenue[0]?.total_revenue || 0,
            previous: previousRevenue[0]?.total_revenue || 0,
          },
          visitors: {
            current: currentVisitors[0]?.unique_visitors || 0,
            previous: previousVisitors[0]?.unique_visitors || 0,
          },
          newSessions: {
            current: currentVisitors[0]?.new_sessions || 0,
            previous: previousVisitors[0]?.new_sessions || 0,
          },
          returningSessions: {
            current: currentVisitors[0]?.returning_sessions || 0,
            previous: previousVisitors[0]?.returning_sessions || 0,
          },
          conversionRate: {
            current: currentConversion[0]?.conversion_rate || 0,
            previous: previousConversion[0]?.conversion_rate || 0,
          },
        });

        // Chart 1: Funnel Analysis (Lifecycle Stages)
        const funnelQuery = {
          table: "sessions" as const,
          dimensions: ["max_lifecycle_stage"],
          measures: ["unique_visitors"],
          filters: [
            currentPeriodFilter,
            "max_lifecycle_stage IN ('awareness', 'consideration', 'trial', 'activation', 'retention')",
          ],
          explanation: "Lifecycle funnel showing conversion through stages",
        };

        const funnelData = await tables.sessions.query({
          dimensions: funnelQuery.dimensions,
          measures: funnelQuery.measures,
          filters: funnelQuery.filters,
        });

        // Sort funnel stages in correct order
        const stageOrder = ["awareness", "consideration", "trial", "activation", "retention"];
        const sortedFunnelData = funnelData.sort((a, b) =>
          stageOrder.indexOf(a.max_lifecycle_stage) - stageOrder.indexOf(b.max_lifecycle_stage)
        );

        const funnelConfig = generateRechartsConfig(funnelQuery, sortedFunnelData, semanticConfig);
        funnelConfig.type = "funnel"; // Force funnel type

        // Chart 2: Attribution Analysis (Traffic Source Performance)
        const attributionQuery = {
          table: "sessions" as const,
          dimensions: ["traffic_source"],
          measures: ["session_count", "conversion_rate", "total_revenue"],
          filters: [currentPeriodFilter, "traffic_source != ''"],
          explanation: "Attribution analysis by traffic source",
        };

        const attributionData = await tables.sessions.query({
          dimensions: attributionQuery.dimensions,
          measures: attributionQuery.measures,
          filters: attributionQuery.filters,
        });

        const attributionConfig = generateRechartsConfig(
          attributionQuery,
          attributionData,
          semanticConfig,
        );
        attributionConfig.type = "bar";

        // Chart 3: Period-over-Period Retention Curve (Sessions over Time)
        const retentionQuery = {
          table: "sessions" as const,
          dimensions: ["session_date"],
          measures: ["unique_visitors", "returning_sessions"],
          filters: ["session_date >= CURRENT_DATE - INTERVAL '90 days'"],
          explanation: "Retention curve showing returning visitor trends",
        };

        const retentionData = await tables.sessions.query({
          dimensions: retentionQuery.dimensions,
          measures: retentionQuery.measures,
          filters: retentionQuery.filters,
        });

        const retentionConfig = generateRechartsConfig(
          retentionQuery,
          retentionData,
          semanticConfig,
        );
        retentionConfig.type = "line";
        retentionConfig.title = "Retention Curve (90 Days)";

        // Chart 4: Traffic Source Breakdown
        const sourceQuery = {
          table: "sessions" as const,
          dimensions: ["traffic_source"],
          measures: ["session_count"],
          filters: [currentPeriodFilter, "traffic_source != ''"],
          explanation: "Session volume by traffic source",
        };

        const sourceData = await tables.sessions.query({
          dimensions: sourceQuery.dimensions,
          measures: sourceQuery.measures,
          filters: sourceQuery.filters,
        });

        const sourceConfig = generateRechartsConfig(sourceQuery, sourceData, semanticConfig);

        setCharts({
          funnel: funnelConfig,
          attribution: attributionConfig,
          retention: retentionConfig,
          trafficSource: sourceConfig,
        });
      } catch (error) {
        console.error("Failed to load sessions data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [db]);

  return (
    <div class="space-y-6">
      {/* KPI Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue (30d)"
          value={kpiData.revenue?.current || 0}
          previousValue={kpiData.revenue?.previous}
          format="currency"
          decimals={0}
          loading={loading}
          description="vs previous 30 days"
        />

        <KPICard
          title="Unique Visitors (30d)"
          value={kpiData.visitors?.current || 0}
          previousValue={kpiData.visitors?.previous}
          format="number"
          loading={loading}
          description="vs previous 30 days"
        />

        <KPICard
          title="New Visitors (30d)"
          value={kpiData.newSessions?.current || 0}
          previousValue={kpiData.newSessions?.previous}
          format="number"
          loading={loading}
          description="First-time visitors"
        />

        <KPICard
          title="Conversion Rate (30d)"
          value={kpiData.conversionRate?.current || 0}
          previousValue={kpiData.conversionRate?.previous}
          format="percentage"
          decimals={2}
          loading={loading}
          description="Overall conversion rate"
        />
      </div>

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Analysis */}
        {charts.funnel && (
          <RechartsWrapper
            config={charts.funnel}
            loading={loading}
            height={400}
          />
        )}

        {/* Attribution Analysis */}
        {charts.attribution && (
          <RechartsWrapper
            config={charts.attribution}
            loading={loading}
            height={400}
          />
        )}
      </div>

      {/* Full-width Retention Curve */}
      <div class="w-full">
        {charts.retention && (
          <RechartsWrapper
            config={charts.retention}
            loading={loading}
            height={350}
          />
        )}
      </div>

      {/* Insights Section */}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
          Key Insights
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <p class="font-semibold mb-1">🎯 Funnel Optimization</p>
            <p>Identify drop-off points between lifecycle stages to improve conversion rates.</p>
          </div>
          <div>
            <p class="font-semibold mb-1">📊 Traffic Quality</p>
            <p>Compare conversion rates and revenue by source to optimize marketing spend.</p>
          </div>
          <div>
            <p class="font-semibold mb-1">🔄 Retention Trends</p>
            <p>Monitor returning visitor patterns to detect churn signals early.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
