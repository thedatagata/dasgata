import { FreshContext, MiddlewareHandler } from "$fresh/server.ts";

export const handler: MiddlewareHandler = (req: Request, ctx: FreshContext) => {
  // Skip auth check for login
  if (new URL(req.url).pathname === "/admin/login") {
    return ctx.next();
  }
  
  // Check authentication - using proper type checking
  const session = ctx.state.session;
  const isAuthenticated = session && session.authenticated === true && session.isAdmin === true;
  
  if (!isAuthenticated) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin/login" },
    });
  }
  
  return ctx.next();
};