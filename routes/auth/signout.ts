// routes/auth/signout.ts
import { Handlers } from "$fresh/server.ts";
import { getKv } from "../../utils/db.ts";

export const handler: Handlers = {
  async GET(req) {
    // Get session cookie
    const cookies = req.headers.get("cookie");
    const sessionCookie = cookies?.split(';')
      .find(c => c.trim().startsWith('user_session='))
      ?.split('=')[1];

    if (sessionCookie) {
      // Delete session from KV
      const kv = getKv();
      await kv.delete(["user_sessions", sessionCookie]);
    }

    // Clear cookie and redirect to home
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": "user_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
      }
    });
  }
};
