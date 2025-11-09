typescriptimport { init } from "@launchdarkly/node-server-sdk";
import { Observability } from "@launchdarkly/observability-node";

const client = init(
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

export { client };