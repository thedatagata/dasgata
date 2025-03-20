// utils/config.ts

// Auto-load environment variables
import "@std/dotenv/load";

// Helper functions for environment variable management
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, defaultValue: string): string {
  return Deno.env.get(name) || defaultValue;
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
  
  // Database config
  database: {
    path: getOptionalEnv("DB_PATH", "./db/contact.db"),
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