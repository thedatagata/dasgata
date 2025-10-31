// routes/auth/signin.ts
import { Handlers } from "$fresh/server.ts";
import { createGoogleOAuthConfig, createHelpers } from "@deno/kv-oauth";

// Determine if we're in development or production
const isLocalDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

// Create Google OAuth configuration for user auth
const userOAuthConfig = createGoogleOAuthConfig({
  redirectUri: isLocalDevelopment 
    ? "http://localhost:8000/auth/callback"
    : "https://gata-swamp.io/auth/callback",
  scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
});

const { signIn } = createHelpers(userOAuthConfig);

export const handler: Handlers = {
  async GET(req) {
    return await signIn(req);
  },
};
