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
  // Skip auth for login route
  if (ctx.url.pathname === "/admin/login") {
    return await ctx.next();
  }

  try {
    // Parse cookies manually
    const cookieHeader = req.headers.get("Cookie") || "";
    const cookies = parseCookies(cookieHeader);
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

// Simple cookie parser
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });
  
  return cookies;
}