import { createGoogleOAuthConfig, createHelpers } from "@deno/kv-oauth";
import { config } from "./config.ts";

// Determine if we're in development or production
const isLocalDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

// Create Google OAuth configuration
export const oauthConfig = createGoogleOAuthConfig({
  // Dynamically set the redirect URI based on environment
  redirectUri: isLocalDevelopment 
    ? "http://localhost:8000/admin/oauth/callback"
    : "https://gata-swamp.io/admin/oauth/callback", // Update with your production domain
  
  // Request email scope to get user's email
  scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
});

// Create OAuth helpers
export const {
  signIn,
  handleCallback,
  getSessionId,
  signOut,
} = createHelpers(oauthConfig);

// Authorized admin emails
export const AUTHORIZED_EMAILS = [
  config.admin.email || "thedatagata@gmail.com"
];