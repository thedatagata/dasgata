// routes/auth/callback.ts
import { Handlers } from "$fresh/server.ts";
import { getUserOAuth } from "../../utils/oauth.ts";
import { getKv } from "../../utils/db.ts";
import { config } from "../../utils/config.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const { response, sessionId, tokens } = await getUserOAuth().handleCallback(req);
      console.log("Session ID:", sessionId);
      console.log("Tokens:", tokens);

      if (sessionId && tokens?.accessToken) {
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
          const userName = userInfo.name || userEmail;
          const userPicture = userInfo.picture || "";

          console.log(`User authenticated: ${userEmail}`);

          const kv = getKv();
          const userSessionId = crypto.randomUUID();
          
          const userRecord = await kv.get(["users", userEmail]);
          const hasCompletedOnboarding = (userRecord?.value as any)?.onboardingCompleted || false;
          const userPlan = (userRecord?.value as any)?.plan || "trial";
          console.log("Has completed onboarding:", hasCompletedOnboarding);

          await kv.set(["user_sessions", userSessionId], {
            email: userEmail,
            name: userName,
            picture: userPicture,
            plan: userPlan,
            createdAt: Date.now(),
            expires: Date.now() + config.session.maxAge * 1000
          });

          if (!userRecord?.value) {
            await kv.set(["users", userEmail], {
              email: userEmail,
              name: userName,
              picture: userPicture,
              createdAt: Date.now(),
              onboardingCompleted: false,
              department: null,
              metrics: [],
              sources: []
            });
          }

          const headers = new Headers(response.headers);
          headers.set(
            "Set-Cookie", 
            `user_session=${userSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.session.maxAge}`
          );

          const redirectUrl = hasCompletedOnboarding ? "/app/dashboard" : "/onboarding/plans";
          console.log("Redirect URL:", redirectUrl);
          headers.set("Location", redirectUrl);

          return new Response(null, {
            status: 302,
            headers
          });
        }
      }

      console.error("Authentication failed: Missing session ID or access token.");
      return new Response(null, {
        status: 302,
        headers: { Location: "/?error=auth_failed" }
      });
    } catch (error) {
      console.error("Error in OAuth callback:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: "/?error=auth_error" }
      });
    }
  },
};
