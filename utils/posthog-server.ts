// utils/posthog-server.ts
import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function getPostHogClient() {
  if (!client) {
    const apiKey = Deno.env.get("POSTHOG_API_KEY");
    if (!apiKey) {
      console.error("POSTHOG_API_KEY environment variable not set");
      return null;
    }

    client = new PostHog(apiKey, {
      host: "https://swamp-data-pipe.dasgata.com", // Replace with your host if different
      flushAt: 1, // For server-side, flush immediately
      disableGeoip: false // Enable location tracking
    });
  }
  return client;
}

export async function shutdownPostHogClient() {
  if (client) {
    await client.shutdown();
    client = null;
  }
}