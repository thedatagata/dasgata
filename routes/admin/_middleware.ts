// routes/admin/_middleware.ts
import { FreshContext } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";
import { config } from "../../utils/config.ts";

interface AdminState {
  isLoggedIn: boolean;
  email?: string;
}

export async function handler(
  req: Request,
  ctx: FreshContext<AdminState>
) {
  // Skip auth for OAuth-related routes
  if (
    ctx.url.pathname === "/admin/oauth/signin" ||
    ctx.url.pathname === "/admin/oauth/callback" ||
    ctx.url.pathname === "/admin/oauth/signout"
  ) {
    return await ctx.next();
  }

  try {
    // Parse cookies manually
    const cookieHeader = req.headers.get("Cookie") || "";
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        cookies[name] = value;
      }
    });
    
    const sessionId = cookies[config.session.cookieName];

    if (!sessionId) {
      console.log("No session cookie found, redirecting to OAuth signin");
      return redirectToOAuthSignin(req.url);
    }

    // Verify session in KV
    const kv = getKv();
    const sessionResult = await kv.get(["sessions", sessionId]);
    const session = sessionResult.value as { email: string; expires: number } | null;

    if (!session) {
      console.log("Session not found in KV, redirecting to OAuth signin");
      return redirectToOAuthSignin(req.url);
    }

    if (session.expires < Date.now()) {
      console.log("Session expired, redirecting to OAuth signin");
      return redirectToOAuthSignin(req.url);
    }

    // Set state for downstream handlers
    ctx.state.isLoggedIn = true;
    ctx.state.email = session.email;
    
    // Continue to the route handler
    return await ctx.next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return redirectToOAuthSignin(req.url);
  }
}

// IMPORTANT: Updated to redirect to OAuth sign-in instead of login
function redirectToOAuthSignin(currentUrl: string): Response {
  const url = new URL("/admin/oauth/signin", currentUrl);
  url.searchParams.set("success_url", currentUrl);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString()
    }
  });
}