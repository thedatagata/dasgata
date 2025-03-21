// routes/admin/logout.ts
import { Handlers } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";
import { config } from "../../utils/config.ts";

export const handler: Handlers = {
  async POST(req, _ctx) {
    try {
      // Get the session cookie
      const sessionCookie = req.headers.get("Cookie")?.match(
        new RegExp(`(^|;)\\s*${config.session.cookieName}\\s*=\\s*([^;]+)`)
      )?.[2];
      
      if (sessionCookie) {
        // Delete the session from KV
        const kv = getKv();
        await kv.delete(["sessions", sessionCookie]);
      }
      
      // Clear the cookie and redirect to login
      const headers = new Headers();
      headers.set(
        "Set-Cookie", 
        `${config.session.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
      );
      headers.set("Location", "/admin/login");
      
      return new Response(null, {
        status: 302,
        headers
      });
    } catch (error) {
      console.error("Logout error:", error);
      // If there's an error, still try to redirect to login
      const headers = new Headers();
      headers.set("Location", "/admin/login");
      
      return new Response(null, {
        status: 302,
        headers
      });
    }
  }
};