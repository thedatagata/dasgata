// utils/config.ts

// Load environment variables if available
import { load } from "@std/dotenv/mod.ts";

try {
  await load({ export: true });
} catch (err) {
  console.log("No .env file found or error loading it");
}

// Helper function for required environment variables
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Application configuration object
export const config = {
  // Admin credentials
  admin: {
    email: getRequiredEnv("ADMIN_EMAIL"),
    password: getRequiredEnv("ADMIN_PASSWORD"),
  },
  
  // Session config (kept as it may be necessary for auth)
  session: {
    secret: getRequiredEnv("SESSION_SECRET"),
    cookieName: "data_gata_session",
    maxAge: 86400, // 24 hours in seconds
  },
  
  // PostHog config
  posthog: {
    apiKey: getRequiredEnv("POSTHOG_API_KEY"),
    apiHost: Deno.env.get("POSTHOG_API_HOST") || "https://swamp-data-pipe.dasgata.com",
  }
};