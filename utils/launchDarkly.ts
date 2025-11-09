import * as LaunchDarkly from "@launchdarkly/node-server-sdk";

const client = LaunchDarkly.init(Deno.env.get("LAUNCHDARKLY_SDK_KEY")!);

await client.waitForInitialization();

export default client;