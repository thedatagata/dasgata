
// routes/_middleware.ts
import { FreshContext } from "$fresh/server.ts";
import { getKv } from "../utils/db.ts";
import { config } from "../utils/config.ts";
import { AUTHORIZED_EMAILS } from "../utils/oauth.ts";

interface AdminState {
  isLoggedIn: boolean;
  email?: string;
}

export async function handler(
  req: Request,
  ctx: FreshContext<AdminState>
) {
  // Skip auth for OAuth routes
  if (
    ctx.url.pathname === "/admin/oauth/signin" ||
    ctx.url.pathname === "/admin/oauth/callback" ||
    ctx.url.pathname === "/admin/oauth/signout"
  ) {
    console.log(`Skipping auth check for OAuth route: ${ctx.url.pathname}`);
    return await ctx.next();
  }

  // Only apply auth middleware to admin routes
  if (!ctx.url.pathname.startsWith("/admin")) {
    return await ctx.next();
  }

  try {
    // Parse cookies manually
    const cookieHeader = req.headers.get("Cookie") || "";
    console.log("Cookie header:", cookieHeader);
    
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        cookies[name] = value;
      }
    });
    
    console.log("Parsed cookies:", cookies);
    
    const sessionId = cookies[config.session.cookieName];
    console.log("Session ID from cookie:", sessionId);

    if (!sessionId) {
      console.log("No session cookie found, redirecting to OAuth signin");
      return redirectToOAuthSignin(req.url);
    }

    // Verify session in KV
    const kv = getKv();
    const sessionResult = await kv.get(["sessions", sessionId]);
    
    if (sessionResult.value) {
      console.log("Session found:", sessionResult.value);
    } else {
      console.log("No session found for ID:", sessionId);
    }
    
    const session = sessionResult.value as { email: string; expires: number } | null;

    if (!session) {
      console.log("Session not found in KV, redirecting to OAuth signin");
      return redirectToOAuthSignin(req.url);
    }

    if (session.expires < Date.now()) {
      console.log("Session expired, redirecting to OAuth signin");
      return redirectToOAuthSignin(req.url);
    }
    
    // Check if the email is authorized
    if (!isAuthorizedEmail(session.email)) {
      console.log(`Unauthorized access attempt by: ${session.email}`);
      return new Response("Unauthorized: You do not have permission to access this area", { 
        status: 401,
        headers: {
          "Content-Type": "text/html"
        }
      });
    }

    // Set state for downstream handlers
    ctx.state.isLoggedIn = true;
    ctx.state.email = session.email;
    console.log(`Authenticated user: ${session.email} accessing ${ctx.url.pathname}`);
    
    // Continue to the route handler
    return await ctx.next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return redirectToOAuthSignin(req.url);
  }
}

// Function to check if an email is in the authorized list
function isAuthorizedEmail(email: string): boolean {
  return AUTHORIZED_EMAILS.includes(email);
}

// Updated to redirect to OAuth sign-in instead of login
function redirectToOAuthSignin(currentUrl: string): Response {
  const url = new URL("/admin/oauth/signin", currentUrl);
  url.searchParams.set("success_url", currentUrl);
  
  console.log(`Redirecting to OAuth signin with success_url: ${currentUrl}`);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString()
    }
  });
}