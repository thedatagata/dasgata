import { FreshContext } from "$fresh/server.ts";

// MVP: No onboarding or plan restrictions
export async function handler(req: Request, ctx: FreshContext) {
  return await ctx.next();
}
