import { FreshContext, MiddlewareHandler } from "$fresh/server.ts";
import { initDatabase } from "../utils/db.ts";
import { config } from "../utils/config.ts";
import { deleteCookie, getCookies, setCookie } from "$std/http/cookie.ts";

// Update routes/_middleware.ts to include this at the top:

// Define session interface
interface SessionData {
  authenticated?: boolean;
  isAdmin?: boolean;
  [key: string]: any;
}

// Extend Fresh's state
declare module "$fresh/server.ts" {
  interface State {
    session: SessionData;
  }
}

// Initialize database when server starts
await initDatabase();

export const handler: MiddlewareHandler = async (req: Request, ctx: FreshContext) => {
  // Get session from cookie
  const cookies = getCookies(req.headers);
  const sessionCookie = cookies[config.session.cookieName];
  
  let sessionData = {};
  if (sessionCookie) {
    try {
      sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    } catch (e) {
      console.error("Error parsing session:", e);
    }
  }
  
  // Add session to context
  ctx.state.session = sessionData;
  const response = await ctx.next();
  
  // Update cookie if session changed
  if (ctx.state.session && Object.keys(ctx.state.session).length > 0) {
    setCookie(response.headers, {
      name: config.session.cookieName,
      value: encodeURIComponent(JSON.stringify(ctx.state.session)),
      maxAge: config.session.maxAge,
      httpOnly: true,
      path: "/",
      sameSite: "Lax",
    });
  } else if (sessionCookie && !ctx.state.session) {
    // Clear if session was destroyed
    deleteCookie(response.headers, config.session.cookieName, { path: "/" });
  }
  
  return response;
};