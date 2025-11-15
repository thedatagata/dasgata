import type { Context } from "fresh";

export function handler(ctx: Context) {
  const token = Deno.env.get("MOTHERDUCK_TOKEN") || "";
  return new Response(JSON.stringify({ token }), {
    headers: { "Content-Type": "application/json" },
  });
}
