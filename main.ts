// main.ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { initLaunchDarkly, closeLaunchDarkly } from "./utils/launchdarkly.ts";

if (Deno.env.get("BUILD_PHASE") !== "true") {
  await import("$std/dotenv/load.ts");
}

// Initialize LaunchDarkly before starting server
console.log("🚀 Initializing LaunchDarkly...");
await initLaunchDarkly();

await start(manifest, config);

Deno.addSignalListener("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await closeLaunchDarkly();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  console.log("\n🛑 Shutting down...");
  await closeLaunchDarkly();
  Deno.exit(0);
});