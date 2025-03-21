// routes/_middleware.ts
import { FreshContext } from "$fresh/server.ts";
import { getKv } from "../utils/db.ts";
import { config } from "../utils/config.ts";

interface AdminState {
  isLoggedIn: boolean;
  email?: string;
}

export async function handler(
  req: Request,
  ctx: FreshContext<AdminState>
) {
  // Skip auth for login route
  if (ctx.url.pathname === "/admin/login") {
    return await ctx.next();
  }

  // Only apply auth middleware to admin routes
  if (!ctx.url.pathname.startsWith("/admin")) {
    return await ctx.next();
  }

  try {
    // Parse cookies manually without using JSON.parse
    const cookieHeader = req.headers.get("Cookie") || "";
    const cookies: Record<string, string> = {};
    
    // Split the cookie header into individual cookies
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length >= 2) {
        // The cookie name is the first part, the value is everything else joined by =
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        cookies[name] = value;
      }
    });
    
    const sessionId = cookies[config.session.cookieName];

    if (!sessionId) {
      console.log("No session cookie found, redirecting to login");
      return redirectToLogin(req.url);
    }

    // Verify session in KV
    const kv = getKv();
    const sessionResult = await kv.get(["sessions", sessionId]);
    const session = sessionResult.value as { email: string; expires: number } | null;

    if (!session) {
      console.log("Session not found in KV, redirecting to login");
      return redirectToLogin(req.url);
    }

    if (session.expires < Date.now()) {
      console.log("Session expired, redirecting to login");
      return redirectToLogin(req.url);
    }

    // Set state for downstream handlers
    ctx.state.isLoggedIn = true;
    ctx.state.email = session.email;
    
    // Continue to the route handler
    return await ctx.next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return redirectToLogin(req.url);
  }
}

function redirectToLogin(currentUrl: string): Response {
  const url = new URL("/admin/login", currentUrl);
  url.searchParams.set("redirectTo", currentUrl);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString()
    }
  });
}