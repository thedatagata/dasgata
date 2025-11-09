import { Handlers } from "$fresh/server.ts";
import { LDObserve } from "@launchdarkly/observability-node";

export const handler: Handlers = {
  async POST(req, ctx) {
    const { metric, feature, userId, value = 1, tags = [] } = await req.json();
    
    LDObserve.recordMetric({
      name: metric,
      value,
      tags: [
        { name: "feature", value: feature },
        { name: "user", value: userId },
        ...tags
      ]
    });
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};