// routes/_middleware.ts
import type { Context } from "fresh";

export default async function middleware(ctx: Context) {
  const resp = await ctx.next();

  // Required for MotherDuck (SharedArrayBuffer)
  resp.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  resp.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

  return resp;
}
