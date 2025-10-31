// routes/auth/callback.ts
import { Handlers } from "$fresh/server.ts";
import { createGoogleOAuthConfig, createHelpers } from "@deno/kv-oauth";
import { getKv } from "../../utils/db.ts";
import { config } from "../../utils/config.ts";

// Determine if we're in development or production
const isLocalDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

// Create Google OAuth configuration for user auth (must match signin.ts)
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
          const userName = userInfo.name || userEmail;
          const userPicture = userInfo.picture || "";
          
          console.log(`User authenticated: ${userEmail}`);
          
          // Create/update user in KV store
          const kv = getKv();
          const userSessionId = crypto.randomUUID();
          
          // Store user session
          await kv.set(["user_sessions", userSessionId], {
            email: userEmail,
            name: userName,
            picture: userPicture,
            createdAt: Date.now(),
            expires: Date.now() + config.session.maxAge * 1000
          });
          
          // Check if user has completed onboarding
          const userRecord = await kv.get(["users", userEmail]);
          const hasCompletedOnboarding = userRecord?.value?.onboardingCompleted || false;
          
          // If this is a new user, create their record
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
          
          // Set session cookie
          const headers = new Headers(response.headers);
          headers.set(
            "Set-Cookie", 
            `user_session=${userSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.session.maxAge}`
          );
          
          // Redirect based on onboarding status
          const redirectUrl = hasCompletedOnboarding ? "/app" : "/onboarding/department";
          headers.set("Location", redirectUrl);
          
          return new Response(null, {
            status: 302,
            headers
          });
        }
      }
      
      // If anything fails, redirect to home with error
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
