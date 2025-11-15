import type { Context } from "fresh";

// routes/health.ts
export function handler(ctx: Context) {
  return new Response(
    JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "thedenogatar",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
