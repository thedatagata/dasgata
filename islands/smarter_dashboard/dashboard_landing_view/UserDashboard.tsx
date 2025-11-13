// islands/UsersDashboard.tsx
import { useEffect, useState } from "preact/hooks";
import KPICard from "../../components/KPICard.tsx";
import PlotlyChart from "../../components/PlotlyChart.tsx";
import { createSemanticTables } from "../../utils/semantic/semantic-amplitude.ts";
import { usersDashboardQueries } from "../../utils/semantic/dashboard-queries.ts";
import { generatePlotlyConfig } from "../../utils/semantic/plotly-generator.ts";

export default function UsersDashboard({ db }) {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<any>({});
  const [chartData, setChartData] = useState<any>({});

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const tables = createSemanticTables(db);

      try {
        // Load all queries
        const results: any = {};
        
        for (const query of usersDashboardQueries) {
          const table = tables[query.table];
          const data = await table.query({
            dimensions: query.dimensions,
            measures: query.measures,
            filters: query.filters
          });
          
          results[query.id] = {
            query,
            data
          };
        }

        // Separate KPIs from charts
        const kpis: any = {};
        const charts: any = {};
        
        for (const [id, result] of Object.entries(results)) {
          const { query, data } = result as any;
          
          if (query.chartType === 'kpi') {
            kpis[id] = { query, data };
          } else {
            const plotlyConfig = generatePlotlyConfig(query, data);
            charts[id] = { query, ...plotlyConfig };
          }
        }
        
        setKpiData(kpis);
        setChartData(charts);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [db]);

  // Extract KPI values
  const getKPIValue = (id: string, measure: string) => {
    const kpi = kpiData[id];
    if (!kpi || !kpi.data || kpi.data.length === 0) return 0;
    return kpi.data[0]?.[measure] || 0;
  };

  const totalLTV = getKPIValue('users_total_revenue', 'total_ltv');
  const totalCustomers = getKPIValue('users_total_customers', 'paying_customers');
  
  // Calculate retention metrics (convert BigInt to Number)
  const retentionData = kpiData['users_retention']?.data || [];
  const activeCustomers = Number(retentionData.find((r: any) => r.is_active_30d === true)?.user_count || 0);
  const inactiveCustomers = Number(retentionData.find((r: any) => r.is_active_30d === false)?.user_count || 0);
  const retentionRate = Number(totalCustomers) > 0 ? (activeCustomers / Number(totalCustomers)) * 100 : 0;

  return (
    <div class="space-y-6">
      {/* KPI Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total LTV"
          value={totalLTV}
          format="currency"
          decimals={0}
          description="Lifetime value across all users"
          loading={loading}
        />
        
        <KPICard
          title="Paying Customers"
          value={totalCustomers}
          format="number"
          description="Current paying customers"
          loading={loading}
        />
        
        <KPICard
          title="Active Customers"
          value={activeCustomers}
          format="number"
          description="Active in last 30 days"
          loading={loading}
        />
        
        <KPICard
          title="Retention Rate"
          value={retentionRate}
          format="percentage"
          decimals={1}
          description="Active / Total paying customers"
          loading={loading}
        />
      </div>

      {/* Net Retention Alert */}
      {!loading && (
        <div class={`border rounded-lg p-4 ${
          retentionRate < 50 
            ? 'bg-red-50 border-red-200' 
            : retentionRate < 70 
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-green-50 border-green-200'
        }`}>
          <div class="font-semibold mb-1">
            {retentionRate < 50 && '🚨 Critical: High Customer Churn'}
            {retentionRate >= 50 && retentionRate < 70 && '⚠️ Warning: Moderate Churn'}
            {retentionRate >= 70 && '✓ Healthy: Good Retention'}
          </div>
          <div class="text-sm">
            {inactiveCustomers > 0 && (
              <span>{inactiveCustomers} customers at risk of churning (inactive 30+ days)</span>
            )}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFM Analysis */}
        {chartData['rfm_analysis'] && (
          <div class="lg:col-span-2">
            <div class="bg-white rounded-lg shadow-md p-4 mb-2">
              <h3 class="font-semibold mb-1">RFM Segmentation</h3>
              <p class="text-sm text-gray-600">
                Identify high-value customers and churn risks based on Recency (activity), 
                Frequency (sessions), and Monetary (LTV) metrics
              </p>
            </div>
            <PlotlyChart
              data={chartData['rfm_analysis'].data}
              layout={chartData['rfm_analysis'].layout}
              loading={loading}
            />
          </div>
        )}

        {/* Cohort Retention */}
        {chartData['cohort_retention'] && (
          <div class="lg:col-span-2">
            <div class="bg-white rounded-lg shadow-md p-4 mb-2">
              <h3 class="font-semibold mb-1">Cohort Retention Analysis</h3>
              <p class="text-sm text-gray-600">
                Track retention rates by signup cohort to identify trends and optimize onboarding
              </p>
            </div>
            <PlotlyChart
              data={chartData['cohort_retention'].data}
              layout={chartData['cohort_retention'].layout}
              loading={loading}
            />
          </div>
        )}

        {/* Lifecycle Distribution */}
        {chartData['lifecycle_distribution'] && (
          <PlotlyChart
            data={chartData['lifecycle_distribution'].data}
            layout={chartData['lifecycle_distribution'].layout}
            loading={loading}
          />
        )}

        {/* LTV by Plan Tier */}
        {chartData['ltv_by_plan'] && (
          <PlotlyChart
            data={chartData['ltv_by_plan'].data}
            layout={chartData['ltv_by_plan'].layout}
            loading={loading}
          />
        )}
      </div>

      {/* Action Items */}
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 class="font-semibold text-purple-900 mb-2">Recommended Actions</h3>
        <ul class="text-sm text-purple-800 space-y-1">
          <li>• <strong>Re-engagement Campaign:</strong> Target inactive customers in RFM analysis before they churn</li>
          <li>• <strong>Cohort Analysis:</strong> Identify which cohorts have best retention and replicate their onboarding</li>
          <li>• <strong>Value Optimization:</strong> Focus on moving users from lower lifecycle stages to activation</li>
          <li>• <strong>Plan Tier Expansion:</strong> Analyze LTV by tier to optimize pricing and upsell opportunities</li>
        </ul>
      </div>
    </div>
  );
}