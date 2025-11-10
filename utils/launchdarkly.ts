import * as LaunchDarkly from "@launchdarkly/node-server-sdk";
import { Observability } from "@launchdarkly/observability-node"

let client: LaunchDarkly.LDClient | null = null;

export async function initLaunchDarkly() {
  if (Deno.env.get("BUILD_PHASE")) {
    console.log("Skipping LaunchDarkly initialization during build phase");
    return;
  }

  if (client) {
    console.log("LaunchDarkly already initialized");
    return;
  }

  const sdkKey = Deno.env.get("LAUNCHDARKLY_SDK_KEY");
  if (!sdkKey) {
    console.warn("LAUNCHDARKLY_SDK_KEY not set, skipping initialization");
    return;
  }

  try {
    client = LaunchDarkly.init(sdkKey, {
      plugins: [
        new Observability({
          serviceName: "GATA_ZONE",
          environment: "Production",
        }),
      ],
    });
    
    await client.waitForInitialization({ timeout: 5 });
    console.log("LaunchDarkly initialized successfully");
  } catch (error) {
    console.error("LaunchDarkly initialization failed:", error);
    throw error;
  }
}

export async function closeLaunchDarkly() {
  if (client) {
    await client.close();
    console.log("LaunchDarkly client closed");
    client = null;
  }
}

export function getLDClient(): LaunchDarkly.LDClient {
  if (!client) {
    throw new Error("LaunchDarkly client not initialized. Call initLaunchDarkly() first.");
  }
  return client;
}

export default client;
