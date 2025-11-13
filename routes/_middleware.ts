// routes/_middleware.ts
import { MiddlewareHandlerContext } from "$fresh/server.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext,
) {
  const resp = await ctx.next();
  
  // Required for MotherDuck (SharedArrayBuffer)
  resp.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  resp.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  
  return resp;
}
