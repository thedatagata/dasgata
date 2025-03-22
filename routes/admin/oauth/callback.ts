import { Handlers } from "$fresh/server.ts";
import { handleCallback } from "../../../utils/oauth.ts";
import { getKv } from "../../../utils/db.ts";
import { config } from "../../../utils/config.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      // Process the OAuth callback
      const { response, sessionId, tokens } = await handleCallback(req);
      
      if (sessionId && tokens?.accessToken) {
        // Fetch user info from Google
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );
        
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          const userEmail = userInfo.email;
          
          console.log(`Google OAuth authenticated user: ${userEmail}`);
          
          // Create a session in your KV store that your middleware can recognize
          const kv = getKv();
          const adminSessionId = crypto.randomUUID();
          
          await kv.set(["sessions", adminSessionId], {
            email: userEmail,
            expires: Date.now() + config.session.maxAge * 1000
          });
          
          // Modify the response to set your admin session cookie
          const headers = new Headers(response.headers);
          headers.set(
            "Set-Cookie", 
            `${config.session.cookieName}=${adminSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.session.maxAge}`
          );
          
          // Redirect to the admin contacts page
          headers.set("Location", "/admin/contacts");
          
          return new Response(null, {
            status: 302,
            headers
          });
        }
      }
      
      // If anything fails, just return the original response
      return response;
    } catch (error) {
      console.error("Error in OAuth callback:", error);
      return new Response("Authentication error. Please try again.", { 
        status: 500 
      });
    }
  },
};