// routes/app/_middleware.ts
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

  // Check if user has completed onboarding
  const userEmail = (session.value as any).email;
  const userRecord = await kv.get(["users", userEmail]);

  if (userRecord?.value && !(userRecord.value as any).onboardingCompleted) {
    // User hasn't completed onboarding, redirect there
    return new Response(null, {
      status: 302,
      headers: { Location: "/onboarding/department" }
    });
  }

  // Add user info to context
  ctx.state.user = session.value;
  ctx.state.userRecord = userRecord?.value;

  return await ctx.next();
}
