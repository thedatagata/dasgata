import { FreshContext } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";

export async function handler(req: Request, ctx: FreshContext) {
  const userId = ctx.state.email || "anonymous";
  const kv = getKv();
  
  const onboarding = await kv.get(["onboarding", userId]);
  
  console.log(`User ${userId} onboarding status:`, onboarding.value);
  
  if (!onboarding.value && !req.url.includes('/app/loading')) {
    console.log(`Redirecting ${userId} to onboarding`);
    return new Response(null, {
      status: 302,
      headers: { Location: "/onboarding/plans" }
    });
  }

  return await ctx.next();
}
