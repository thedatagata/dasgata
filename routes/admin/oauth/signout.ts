// routes/admin/oauth/signout.ts
import { Handlers } from "$fresh/server.ts";
import { signOut } from "../../../utils/oauth.ts";
import { getKv } from "../../../utils/db.ts";
import { config } from "../../../utils/config.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      // Get the session cookie
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
      
      // Clear the admin session in KV if it exists
      if (sessionId) {
        const kv = getKv();
        await kv.delete(["sessions", sessionId]);
        console.log("Admin session deleted:", sessionId);
      }
      
      // Let the OAuth library handle its own session cleanup
      const oauthResponse = await signOut(req);
      
      // Add our own cookie clearing
      const headers = new Headers(oauthResponse.headers);
      headers.append(
        "Set-Cookie", 
        `${config.session.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
      );
      
      // Make sure we redirect to the homepage after logout
      headers.set("Location", "/");
      
      return new Response(null, {
        status: 302,
        headers
      });
    } catch (error) {
      console.error("Logout error:", error);
      
      // If there's an error, still try to redirect to homepage
      const headers = new Headers();
      headers.set("Location", "/");
      
      return new Response(null, {
        status: 302,
        headers
      });
    }
  }
};