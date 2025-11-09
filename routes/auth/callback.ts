// routes/auth/callback.ts
import { Handlers } from "$fresh/server.ts";
import { createGoogleOAuthConfig, createHelpers } from "@deno/kv-oauth";
import { getKv } from "../../utils/db.ts";
import { config } from "../../utils/config.ts";

const isLocalDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

const userOAuthConfig = createGoogleOAuthConfig({
  redirectUri: isLocalDevelopment 
    ? "http://localhost:8000/auth/callback"
    : "https://gata-swamp.io/auth/callback",
  scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
});

const { handleCallback } = createHelpers(userOAuthConfig);

export const handler: Handlers = {
  async GET(req) {
    try {
      // Extract state parameter for redirect
      const url = new URL(req.url);
      const redirectAfterAuth = url.searchParams.get('state') || null;
      
      const { response, sessionId, tokens } = await handleCallback(req);
      
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
          
          await kv.set(["user_sessions", userSessionId], {
            email: userEmail,
            name: userName,
            picture: userPicture,
            createdAt: Date.now(),
            expires: Date.now() + config.session.maxAge * 1000
          });
          
          const userRecord = await kv.get(["users", userEmail]);
          const hasCompletedOnboarding = userRecord?.value?.onboardingCompleted || false;
          
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
          
          // Use state redirect if provided, otherwise default logic
          let redirectUrl: string;
          if (redirectAfterAuth) {
            redirectUrl = redirectAfterAuth;
          } else {
            redirectUrl = hasCompletedOnboarding ? "/app" : "/onboarding/plans";
          }
          
          headers.set("Location", redirectUrl);
          
          return new Response(null, {
            status: 302,
            headers
          });
        }
      }
      
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
