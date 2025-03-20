import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  POST(_req, ctx) {
    // Clear session
    ctx.state.session = null;
    
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin/login" },
    });
  },
};