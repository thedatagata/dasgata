import { init } from "@launchdarkly/node-server-sdk";
import { Observability } from "@launchdarkly/observability-node";

let client: any;

// Skip initialization during build phase
if (!Deno.env.get("BUILD_PHASE")) {
  client = init(
    Deno.env.get("LAUNCHDARKLY_SDK_KEY") || "",
    {
      plugins: [
        new Observability({
          serviceName: 'data-gata-app',
          serviceVersion: Deno.env.get("GIT_SHA") || 'dev',
          environment: Deno.env.get("DENO_ENV") || 'development'
        })
      ],
    }
  );

  await client.waitForInitialization();
} else {
  // Mock client during build
  client = {};
}

export { client };
