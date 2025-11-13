// islands/SessionsDashboard.tsx
import { useEffect, useState } from "preact/hooks";
import KPICard from "../../../components/KPICard.tsx";
import { createSemanticTables } from "../../../utils/semantic/semantic-amplitude.ts";
import { sessionsDashboardQueries } from "../../../utils/semantic/dashboard-queries.ts";

export default function SessionDashboard({ db }) {
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
        
        for (const query of sessionsDashboardQueries) {
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

  const totalRevenue = getKPIValue('sessions_total_revenue', 'total_revenue');
  const newSessions = getKPIValue('sessions_new_vs_returning', 'new_sessions');
  const returningSessions = getKPIValue('sessions_new_vs_returning', 'returning_sessions');
  
  // Calculate activation metrics
  const activationData = kpiData['sessions_activation_rate']?.data || [];
  const trialSessions = activationData.find((r: any) => r.max_lifecycle_stage === 'trial')?.session_count || 0;
  const activationSessions = activationData.find((r: any) => r.max_lifecycle_stage === 'activation')?.session_count || 0;

  return (
    <div class="space-y-6">
      {/* KPI Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue (30d)"
          value={totalRevenue}
          format="currency"
          decimals={0}
          description="Last 30 days"
          loading={loading}
        />
        
        <KPICard
          title="New Visitors (30d)"
          value={newSessions}
          format="number"
          description="First-time visitors"
          loading={loading}
        />
        
        <KPICard
          title="Returning Visitors (30d)"
          value={returningSessions}
          format="number"
          description="Repeat visitors"
          loading={loading}
        />
        
        <KPICard
          title="Trial + Activation (30d)"
          value={trialSessions + activationSessions}
          format="number"
          description="Users reaching trial or activation"
          loading={loading}
        />
      </div>

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan Tier */}
        {chartData['revenue_by_plan'] && (
          <PlotlyChart
            data={chartData['revenue_by_plan'].data}
            layout={chartData['revenue_by_plan'].layout}
            loading={loading}
          />
        )}

        {/* New vs Returning by Source */}
        {chartData['new_returning_by_source'] && (
          <PlotlyChart
            data={chartData['new_returning_by_source'].data}
            layout={chartData['new_returning_by_source'].layout}
            loading={loading}
          />
        )}

        {/* Funnel by Traffic Source */}
        {chartData['funnel_by_source'] && (
          <div class="lg:col-span-2">
            <PlotlyChart
              data={chartData['funnel_by_source'].data}
              layout={chartData['funnel_by_source'].layout}
              loading={loading}
            />
          </div>
        )}

        {/* Sessions Over Time (Retention Curve) */}
        {chartData['sessions_over_time'] && (
          <div class="lg:col-span-2">
            <PlotlyChart
              data={chartData['sessions_over_time'].data}
              layout={chartData['sessions_over_time'].layout}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* Insights Section */}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-semibold text-blue-900 mb-2">Key Insights</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• <strong>High Churn Alert:</strong> Monitor returning visitor trends - exponential drop-off visible in retention curve</li>
          <li>• <strong>Funnel Optimization:</strong> Most users drop at consideration stage - focus on improving trial conversion</li>
          <li>• <strong>Traffic Quality:</strong> Compare conversion rates by source to optimize marketing spend</li>
        </ul>
      </div>
    </div>
  );
}