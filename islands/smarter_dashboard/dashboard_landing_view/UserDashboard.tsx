// islands/tabs/UsersTab.tsx
import { useEffect, useState } from "preact/hooks";
import KPICard from "../../../components/charts/KPICard.tsx";
import RechartsWrapper from "../../../components/charts/RechartsWrapper.tsx";
import { createSemanticTables } from "../../../utils/semantic/semantic-amplitude.ts";
import { generateRechartsConfig } from "../../../utils/semantic/recharts-generator.ts";
import { getSemanticConfig } from "../../../utils/semantic/semantic_config.ts";

interface UsersTabProps {
  db: any;
}

export default function UsersTab({ db }: UsersTabProps) {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<any>({});
  const [charts, setCharts] = useState<any>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const tables = createSemanticTables(db);
      const semanticConfig = getSemanticConfig();

      try {
        // KPIs
        const totalLTV = await tables.users.query({
          measures: ["total_ltv"],
        });

        const payingCustomers = await tables.users.query({
          measures: ["paying_customers"],
        });

        const avgLTV = await tables.users.query({
          measures: ["avg_ltv"],
        });

        const retentionRate = await tables.users.query({
          measures: ["retention_rate_30d"],
        });

        setKpiData({
          totalLTV: totalLTV[0]?.total_ltv || 0,
          payingCustomers: payingCustomers[0]?.paying_customers || 0,
          avgLTV: avgLTV[0]?.avg_ltv || 0,
          retentionRate: retentionRate[0]?.retention_rate_30d || 0,
        });

        // Chart 1: RFM Analysis (Recency, Frequency, Monetary)
        // Using total_sessions (Frequency) and total_revenue (Monetary)
        const rfmQuery = {
          table: "users" as const,
          dimensions: ["current_plan_tier"],
          measures: ["user_count", "avg_sessions_per_user", "avg_ltv"],
          filters: ["current_plan_tier != ''", "is_paying_customer = TRUE"],
          explanation: "RFM segmentation by plan tier",
        };

        const rfmData = await tables.users.query({
          dimensions: rfmQuery.dimensions,
          measures: rfmQuery.measures,
          filters: rfmQuery.filters,
        });

        const rfmConfig = generateRechartsConfig(rfmQuery, rfmData, semanticConfig);
        rfmConfig.title = "RFM Analysis by Plan Tier";
        rfmConfig.type = "bar";

        // Chart 2: Cohort Analysis (Users by First Event Date)
        const cohortQuery = {
          table: "users" as const,
          dimensions: ["first_event_date"],
          measures: ["user_count", "retention_rate_30d"],
          filters: ["first_event_date >= CURRENT_DATE - INTERVAL '180 days'"],
          explanation: "User cohorts and their 30-day retention",
        };

        const cohortData = await tables.users.query({
          dimensions: cohortQuery.dimensions,
          measures: cohortQuery.measures,
          filters: cohortQuery.filters,
        });

        const cohortConfig = generateRechartsConfig(cohortQuery, cohortData, semanticConfig);
        cohortConfig.title = "Cohort Analysis (6 Months)";
        cohortConfig.type = "line";

        // Chart 3: Net Retention Analysis (Active vs Churned Customers)
        const netRetentionQuery = {
          table: "users" as const,
          dimensions: ["is_active_30d"],
          measures: ["user_count", "total_ltv"],
          filters: ["is_paying_customer = TRUE"],
          explanation: "Net retention: active vs inactive customers",
        };

        const netRetentionData = await tables.users.query({
          dimensions: netRetentionQuery.dimensions,
          measures: netRetentionQuery.measures,
          filters: netRetentionQuery.filters,
        });

        // Transform for better display
        const formattedNetRetention = netRetentionData.map((row) => ({
          ...row,
          status: row.is_active_30d ? "Active (30d)" : "Inactive (30d)",
          is_active_30d: undefined,
        }));

        const netRetentionConfig = generateRechartsConfig(
          { ...netRetentionQuery, dimensions: ["status"] },
          formattedNetRetention,
          semanticConfig,
        );
        netRetentionConfig.title = "Net Retention (Active vs Inactive)";
        netRetentionConfig.type = "bar";

        // Chart 4: LTV by Plan Tier
        const ltvQuery = {
          table: "users" as const,
          dimensions: ["current_plan_tier"],
          measures: ["user_count", "total_ltv"],
          filters: ["current_plan_tier != ''"],
          explanation: "Customer distribution and LTV by plan",
        };

        const ltvData = await tables.users.query({
          dimensions: ltvQuery.dimensions,
          measures: ltvQuery.measures,
          filters: ltvQuery.filters,
        });

        const ltvConfig = generateRechartsConfig(ltvQuery, ltvData, semanticConfig);
        ltvConfig.title = "LTV by Plan Tier";

        // Chart 5: Engagement Distribution (Sessions per User)
        const engagementQuery = {
          table: "users" as const,
          dimensions: ["current_plan_tier"],
          measures: ["avg_sessions_per_user"],
          filters: ["current_plan_tier != ''"],
          explanation: "Average engagement by plan tier",
        };

        const engagementData = await tables.users.query({
          dimensions: engagementQuery.dimensions,
          measures: engagementQuery.measures,
          filters: engagementQuery.filters,
        });

        const engagementConfig = generateRechartsConfig(
          engagementQuery,
          engagementData,
          semanticConfig,
        );

        setCharts({
          rfm: rfmConfig,
          cohort: cohortConfig,
          netRetention: netRetentionConfig,
          ltv: ltvConfig,
          engagement: engagementConfig,
        });
      } catch (error) {
        console.error("Failed to load users data:", error);
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
          title="Total LTV"
          value={kpiData.totalLTV || 0}
          format="currency"
          decimals={0}
          loading={loading}
          description="Lifetime value across all users"
        />

        <KPICard
          title="Paying Customers"
          value={kpiData.payingCustomers || 0}
          format="number"
          loading={loading}
          description="Current paying customers"
        />

        <KPICard
          title="Avg LTV per Customer"
          value={kpiData.avgLTV || 0}
          format="currency"
          decimals={0}
          loading={loading}
          description="Average customer value"
        />

        <KPICard
          title="30-Day Retention"
          value={kpiData.retentionRate || 0}
          format="percentage"
          decimals={1}
          loading={loading}
          description="Active in last 30 days"
        />
      </div>

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFM Analysis */}
        {charts.rfm && (
          <RechartsWrapper
            config={charts.rfm}
            loading={loading}
            height={400}
          />
        )}

        {/* Net Retention Analysis */}
        {charts.netRetention && (
          <RechartsWrapper
            config={charts.netRetention}
            loading={loading}
            height={400}
          />
        )}
      </div>

      {/* Full-width Cohort Analysis */}
      <div class="w-full">
        {charts.cohort && (
          <RechartsWrapper
            config={charts.cohort}
            loading={loading}
            height={350}
          />
        )}
      </div>

      {/* Additional Charts */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.ltv && (
          <RechartsWrapper
            config={charts.ltv}
            loading={loading}
            height={350}
          />
        )}

        {charts.engagement && (
          <RechartsWrapper
            config={charts.engagement}
            loading={loading}
            height={350}
          />
        )}
      </div>

      {/* Insights Section */}
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-purple-900 mb-3 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
          </svg>
          Key Insights
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-800">
          <div>
            <p class="font-semibold mb-1">💎 RFM Segmentation</p>
            <p>
              Identify high-value customers by analyzing recency, frequency, and monetary value
              patterns.
            </p>
          </div>
          <div>
            <p class="font-semibold mb-1">📈 Cohort Performance</p>
            <p>
              Track retention rates across user cohorts to identify trends and optimize onboarding.
            </p>
          </div>
          <div>
            <p class="font-semibold mb-1">🔒 Net Retention</p>
            <p>
              Monitor active vs churned customers to measure customer health and expansion revenue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
