// routes/api/ai-metrics.ts
import { Handlers } from "$fresh/server.ts";

interface MetricData {
  provider: string;
  latency: number;
  cost: number;
  timestamp: string;
  tier: string;
  success: boolean;
}

// In-memory store for demo (use database in production)
const metricsStore: MetricData[] = [];

export const handler: Handlers = {
  // Get aggregated metrics
  async GET(_req) {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Filter last hour
    const recentMetrics = metricsStore.filter(
      m => new Date(m.timestamp).getTime() > oneHourAgo
    );

    const byProvider = recentMetrics.reduce((acc, m) => {
      if (!acc[m.provider]) {
        acc[m.provider] = {
          count: 0,
          totalLatency: 0,
          totalCost: 0,
          successful: 0,
          failed: 0
        };
      }
      acc[m.provider].count++;
      acc[m.provider].totalLatency += m.latency;
      acc[m.provider].totalCost += m.cost;
      if (m.success) {
        acc[m.provider].successful++;
      } else {
        acc[m.provider].failed++;
      }
      return acc;
    }, {} as Record<string, any>);

    const summary = Object.entries(byProvider).map(([provider, stats]) => ({
      provider,
      queries: stats.count,
      avgLatency: Math.round(stats.totalLatency / stats.count),
      totalCost: parseFloat(stats.totalCost.toFixed(4)),
      successRate: parseFloat(((stats.successful / stats.count) * 100).toFixed(2)),
      p95Latency: calculateP95(
        recentMetrics.filter(m => m.provider === provider).map(m => m.latency)
      )
    }));

    return new Response(
      JSON.stringify({
        timeRange: "1h",
        totalQueries: recentMetrics.length,
        summary,
        raw: recentMetrics.slice(-100) // Last 100 data points
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },

  // Store metric (called by query endpoint)
  async POST(req) {
    try {
      const metric: MetricData = await req.json();
      metricsStore.push(metric);

      // Keep only last 10000 metrics
      if (metricsStore.length > 10000) {
        metricsStore.shift();
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};

function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return Math.round(sorted[index]);
}