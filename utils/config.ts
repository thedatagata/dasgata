// utils/config.ts

// Updated dotenv import for Deno v2.2.4
import { load } from "@std/dotenv/mod.ts";

// Load environment variables
try {
  const result = await load({
    export: true,
    allowEmptyValues: true
  });
  console.log("Loaded environment variables:", Object.keys(result).join(", "));
} catch (err) {
  console.log("No .env file found or error loading it:", err.message);
  console.log("Using default environment settings");
}

// Helper functions for environment variable management
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  console.log(`Loaded required env var: ${name}`);
  return value;
}

function getOptionalEnv(name: string, defaultValue: string): string {
  const value = Deno.env.get(name);
  console.log(`Loaded optional env var: ${name} = ${value || '[using default]'}`);
  return value || defaultValue;
}

// Environment detection
const environment = getOptionalEnv("DENO_ENV", "development");
const isProduction = environment === "production";

// Application configuration object
export const config = {
  // Environment information
  environment,
  isProduction,
  isDevelopment: environment === "development",
  
  // Server config
  port: parseInt(getOptionalEnv("PORT", "8000")),
  hostname: getOptionalEnv("HOSTNAME", "localhost"),
  
  // Database config - UPDATED for Deno KV
  database: {
    // For development only - Deno KV path
    path: isProduction 
      ? undefined // In production, Deno Deploy will manage KV storage
      : getOptionalEnv("KV_PATH", "./db/data.kv"),
  },
  
  // Admin credentials
  admin: {
    email: isProduction 
      ? getRequiredEnv("ADMIN_EMAIL") 
      : getOptionalEnv("ADMIN_EMAIL", "admin@example.com"),
    password: isProduction 
      ? getRequiredEnv("ADMIN_PASSWORD") 
      : getOptionalEnv("ADMIN_PASSWORD", "admin123"),
  },
  
  // Session config
  session: {
    secret: isProduction 
      ? getRequiredEnv("SESSION_SECRET") 
      : getOptionalEnv("SESSION_SECRET", "dev_session_secret_do_not_use_in_production"),
    cookieName: getOptionalEnv("SESSION_COOKIE_NAME", "data_gata_session"),
    maxAge: parseInt(getOptionalEnv("SESSION_MAX_AGE", "86400")), // 24 hours in seconds
  },
  
  // PostHog config
  posthog: {
    apiKey: getOptionalEnv("POSTHOG_API_KEY", ""),
    apiHost: getOptionalEnv("POSTHOG_API_HOST", "https://us.i.posthog.com"),
  }
};