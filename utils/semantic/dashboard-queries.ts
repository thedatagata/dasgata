// utils/semantic/dashboard-queries.ts

export interface DashboardQuery {
  id: string;
  table: "sessions" | "users";
  dimensions?: string[];
  measures: string[];
  filters?: string[];
  title: string;
  description: string;
  chartType: 'kpi' | 'bar' | 'line' | 'funnel' | 'heatmap' | 'scatter';
  chartConfig?: any;
}

// Sessions Dashboard Queries
export const sessionsDashboardQueries: DashboardQuery[] = [
  // KPI Cards
  {
    id: "sessions_total_revenue",
    table: "sessions",
    measures: ["total_revenue"],
    filters: ["session_date >= CURRENT_DATE - INTERVAL '30 days'"],
    title: "Total Revenue (30d)",
    description: "Last 30 days vs previous 30 days",
    chartType: "kpi"
  },
  {
    id: "sessions_new_vs_returning",
    table: "sessions",
    measures: ["new_sessions", "returning_sessions"],
    filters: ["session_date >= CURRENT_DATE - INTERVAL '30 days'"],
    title: "New vs Returning (30d)",
    description: "Visitor composition",
    chartType: "kpi"
  },
  {
    id: "sessions_activation_rate",
    table: "sessions",
    dimensions: ["max_lifecycle_stage"],
    measures: ["session_count"],
    filters: [
      "session_date >= CURRENT_DATE - INTERVAL '30 days'",
      "max_lifecycle_stage IN ('trial', 'activation')"
    ],
    title: "Trial & Activation (30d)",
    description: "Users reaching trial/activation stage",
    chartType: "kpi"
  },
  
  // Revenue by Plan Tier
  {
    id: "revenue_by_plan",
    table: "sessions",
    dimensions: ["plan_tier"],
    measures: ["total_revenue", "session_count"],
    filters: ["plan_tier != ''"],
    title: "Revenue by Plan Tier",
    description: "Revenue and session volume by subscription tier",
    chartType: "bar",
    chartConfig: {
      barmode: 'group',
      orientation: 'v'
    }
  },
  
  // New vs Returning by Traffic Source
  {
    id: "new_returning_by_source",
    table: "sessions",
    dimensions: ["traffic_source"],
    measures: ["new_sessions", "returning_sessions"],
    title: "New vs Returning by Source",
    description: "Visitor composition by traffic source",
    chartType: "bar",
    chartConfig: {
      barmode: 'group',
      orientation: 'v'
    }
  },
  
  // Conversion Funnel by Traffic Source
  {
    id: "funnel_by_source",
    table: "sessions",
    dimensions: ["traffic_source", "max_lifecycle_stage"],
    measures: ["session_count"],
    filters: ["max_lifecycle_stage IN ('awareness', 'consideration', 'trial', 'activation', 'retention')"],
    title: "Lifecycle Funnel by Traffic Source",
    description: "How users progress through lifecycle stages by source",
    chartType: "funnel"
  },
  
  // Sessions Over Time (for cohort curve)
  {
    id: "sessions_over_time",
    table: "sessions",
    dimensions: ["session_date"],
    measures: ["session_count", "unique_visitors", "returning_sessions"],
    filters: ["session_date >= CURRENT_DATE - INTERVAL '12 weeks'"],
    title: "Session Trends (12 Weeks)",
    description: "Weekly session patterns showing retention curve",
    chartType: "line"
  }
];

// Users Dashboard Queries
export const usersDashboardQueries: DashboardQuery[] = [
  // KPI Cards
  {
    id: "users_total_revenue",
    table: "users",
    measures: ["total_ltv"],
    title: "Total LTV",
    description: "Lifetime value across all users",
    chartType: "kpi"
  },
  {
    id: "users_total_customers",
    table: "users",
    measures: ["paying_customers"],
    title: "Total Paying Customers",
    description: "Current paying customer count",
    chartType: "kpi"
  },
  {
    id: "users_retention",
    table: "users",
    dimensions: ["is_active_30d"],
    measures: ["user_count"],
    filters: ["is_paying_customer = TRUE"],
    title: "Customer Retention",
    description: "Active vs inactive paying customers",
    chartType: "kpi"
  },
  
  // RFM Analysis
  {
    id: "rfm_analysis",
    table: "users",
    dimensions: ["is_active_30d", "current_plan_tier"],
    measures: ["user_count", "avg_ltv", "avg_sessions_per_user"],
    filters: ["current_plan_tier != ''"],
    title: "RFM Segmentation",
    description: "Recency, Frequency, Monetary analysis by plan tier",
    chartType: "scatter"
  },
  
  // Cohort Analysis
  {
    id: "cohort_retention",
    table: "users",
    dimensions: ["first_event_date"],
    measures: ["user_count", "active_users", "retention_rate_30d"],
    filters: ["first_event_date >= CURRENT_DATE - INTERVAL '12 months'"],
    title: "Monthly Cohort Retention",
    description: "Retention rates by signup cohort",
    chartType: "heatmap"
  },
  
  // Lifecycle Distribution
  {
    id: "lifecycle_distribution",
    table: "users",
    dimensions: ["max_lifecycle_stage_name"],
    measures: ["user_count", "avg_ltv"],
    title: "Users by Lifecycle Stage",
    description: "Distribution of users across lifecycle stages",
    chartType: "bar",
    chartConfig: {
      barmode: 'group',
      orientation: 'h'
    }
  },
  
  // LTV by Plan Tier
  {
    id: "ltv_by_plan",
    table: "users",
    dimensions: ["current_plan_tier"],
    measures: ["user_count", "avg_ltv", "paying_customers"],
    filters: ["current_plan_tier != ''"],
    title: "LTV by Plan Tier",
    description: "Average lifetime value and customer count by tier",
    chartType: "bar",
    chartConfig: {
      barmode: 'group',
      orientation: 'v'
    }
  }
];

export function getQueryById(id: string): DashboardQuery | undefined {
  return [...sessionsDashboardQueries, ...usersDashboardQueries].find(q => q.id === id);
}