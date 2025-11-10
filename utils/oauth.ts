import { createGoogleOAuthConfig, createHelpers } from "@deno/kv-oauth";
import { config } from "./config.ts";

// Determine if we're in development or production
const isLocalDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

let adminOAuthConfigInstance: ReturnType<typeof createGoogleOAuthConfig> | null = null;
let userOAuthConfigInstance: ReturnType<typeof createGoogleOAuthConfig> | null = null;
let adminOAuthInstance: ReturnType<typeof createHelpers> | null = null;
let userOAuthInstance: ReturnType<typeof createHelpers> | null = null;

// Admin OAuth configuration (lazy-loaded)
export function getAdminOAuthConfig() {
  if (!adminOAuthConfigInstance) {
    adminOAuthConfigInstance = createGoogleOAuthConfig({
      redirectUri: isLocalDevelopment 
        ? "http://localhost:8000/admin/oauth/callback"
        : "https://gata-swamp.io/admin/oauth/callback",
      scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
    });
  }
  return adminOAuthConfigInstance;
}

// User OAuth configuration (lazy-loaded)
export function getUserOAuthConfig() {
  if (!userOAuthConfigInstance) {
    userOAuthConfigInstance = createGoogleOAuthConfig({
      redirectUri: isLocalDevelopment 
        ? "http://localhost:8000/auth/callback"
        : "https://gata-swamp.io/auth/callback",
      scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
    });
  }
  return userOAuthConfigInstance;
}

// Admin OAuth helpers (lazy-loaded)
export function getAdminOAuth() {
  if (!adminOAuthInstance) {
    adminOAuthInstance = createHelpers(getAdminOAuthConfig());
  }
  return adminOAuthInstance;
}

// User OAuth helpers (lazy-loaded)
export function getUserOAuth() {
  if (!userOAuthInstance) {
    userOAuthInstance = createHelpers(getUserOAuthConfig());
  }
  return userOAuthInstance;
}

// Legacy exports for backward compatibility
export const adminOAuthConfig = getAdminOAuthConfig;
export const userOAuthConfig = getUserOAuthConfig;
export const adminOAuth = getAdminOAuth;
export const userOAuth = getUserOAuth;

// Individual helper functions
export function signIn(request: Request) {
  return getAdminOAuth().signIn(request);
}

export function handleCallback(request: Request) {
  return getAdminOAuth().handleCallback(request);
}

export function getSessionId(request: Request) {
  return getAdminOAuth().getSessionId(request);
}

export function signOut(request: Request) {
  return getAdminOAuth().signOut(request);
}

// Authorized admin emails
export const AUTHORIZED_EMAILS = [
  config.admin.email || "thedatagata@gmail.com"
];
