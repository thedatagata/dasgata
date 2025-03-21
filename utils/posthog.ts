// utils/posthog.ts
import { PostHog } from "posthog-node";
import { config } from "./config.ts";

// Only initialize PostHog if API key is provided
let posthogClient: PostHog | null = null;

if (config.posthog.apiKey) {
  posthogClient = new PostHog(
    config.posthog.apiKey,
    { host: config.posthog.apiHost }
  );
  console.log("PostHog client initialized");
} else {
  console.log("PostHog API key not provided, analytics disabled");
}

export function trackEvent(
  event: string, 
  distinctId: string, 
  properties: Record<string, unknown> = {}
): void {
  if (!posthogClient) {
    console.log("PostHog tracking disabled, would have tracked:", { event, distinctId, properties });
    return;
  }

  try {
    posthogClient.capture({
      distinctId,
      event,
      properties
    });
    console.log(`Tracked event: ${event}`);
  } catch (error) {
    console.error("Error tracking PostHog event:", error);
  }
}

export function identify(
  distinctId: string,
  properties: Record<string, unknown> = {}
): void {
  if (!posthogClient) {
    console.log("PostHog tracking disabled, would have identified user:", { distinctId, properties });
    return;
  }

  try {
    posthogClient.identify({
      distinctId,
      properties
    });
    console.log(`Identified user: ${distinctId}`);
  } catch (error) {
    console.error("Error identifying user in PostHog:", error);
  }
}

// Ensure events are flushed before the application exits
export function shutdown(): Promise<void> {
  if (posthogClient) {
    return posthogClient.shutdown();
  }
  return Promise.resolve();
}