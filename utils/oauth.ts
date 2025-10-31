import { createGoogleOAuthConfig, createHelpers } from "@deno/kv-oauth";
import { config } from "./config.ts";

// Determine if we're in development or production
const isLocalDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

// Admin OAuth configuration (for admin panel)
export const adminOAuthConfig = createGoogleOAuthConfig({
  redirectUri: isLocalDevelopment 
    ? "http://localhost:8000/admin/oauth/callback"
    : "https://gata-swamp.io/admin/oauth/callback",
  
  scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
});

// User OAuth configuration (for SaaS onboarding)
export const userOAuthConfig = createGoogleOAuthConfig({
  redirectUri: isLocalDevelopment 
    ? "http://localhost:8000/auth/callback"
    : "https://gata-swamp.io/auth/callback",
  
  scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
});

// Admin OAuth helpers
export const adminOAuth = createHelpers(adminOAuthConfig);

// User OAuth helpers  
export const userOAuth = createHelpers(userOAuthConfig);

// Legacy exports for backward compatibility (admin)
export const {
  signIn,
  handleCallback,
  getSessionId,
  signOut,
} = adminOAuth;

// Authorized admin emails
export const AUTHORIZED_EMAILS = [
  config.admin.email || "thedatagata@gmail.com"
];
