// routes/onboarding/_middleware.ts
import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext,
) {
  // Get session cookie
  const cookies = req.headers.get("cookie");
  const sessionCookie = cookies?.split(';')
    .find(c => c.trim().startsWith('user_session='))
    ?.split('=')[1];

  if (!sessionCookie) {
    // No session, redirect to sign in
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/signin" }
    });
  }

  // Verify session exists and is valid
  const kv = getKv();
  const session = await kv.get(["user_sessions", sessionCookie]);

  if (!session?.value || (session.value as any).expires < Date.now()) {
    // Invalid or expired session, redirect to sign in
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/signin" }
    });
  }

  // Add user info to context for use in routes
  ctx.state.user = session.value;

  return await ctx.next();
}
