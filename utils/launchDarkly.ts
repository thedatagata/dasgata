// utils/launchdarkly.ts
import { init } from "@launchdarkly/node-server-sdk";
import { Observability } from "@launchdarkly/observability-node";
import type { 
  LDClient, 
  LDContext, 
  LDMultiKindContext,
  LDContextCommon 
} from "@launchdarkly/node-server-sdk";

// Types for context attributes
export interface UserContext {
  key: string;
  email: string;
  tier: "trial" | "starter" | "premium";
  role?: string;
  sessionStart?: string;
}

export interface OrganizationContext {
  key: string;
  name?: string;
  industry?: string;
  contractValue?: number;
}

export interface SessionContext {
  key: string;
  queryComplexity: "simple" | "medium" | "advanced";
  deviceType: "desktop" | "mobile" | "tablet";
  region: string;
}

export interface MultiContextData {
  user: UserContext;
  organization?: OrganizationContext;
  session: SessionContext;
}

// Client singleton
let ldClient: LDClient | null = null;

export async function initLaunchDarkly(): Promise<LDClient> {
  if (ldClient) return ldClient;

  const sdkKey = Deno.env.get("LAUNCHDARKLY_SDK_KEY");
  if (!sdkKey) {
    throw new Error("LAUNCHDARKLY_SDK_KEY environment variable not set");
  }

  ldClient = init(sdkKey, {
    plugins: [
      new Observability({
        serviceName: 'data-gata-app',
        serviceVersion: Deno.env.get("GIT_SHA") || 'dev',
        environment: Deno.env.get("DENO_ENV") || 'development'
      })
    ],
  });

  await ldClient.waitForInitialization();
  console.log("✅ LaunchDarkly SDK initialized with Observability");
  
  return ldClient;
}

export function getLDClient(): LDClient {
  if (!ldClient) {
    throw new Error("LaunchDarkly client not initialized. Call initLaunchDarkly() first.");
  }
  return ldClient;
}

// Build multi-context
export function buildMultiContext(data: MultiContextData): LDMultiKindContext {
  const contexts: LDContextCommon[] = [
    {
      kind: "user",
      key: data.user.key,
      email: data.user.email,
      tier: data.user.tier,
      ...(data.user.role && { role: data.user.role }),
      ...(data.user.sessionStart && { sessionStart: data.user.sessionStart }),
    },
    {
      kind: "session",
      key: data.session.key,
      queryComplexity: data.session.queryComplexity,
      deviceType: data.session.deviceType,
      region: data.session.region,
    },
  ];

  if (data.organization) {
    contexts.push({
      kind: "organization",
      key: data.organization.key,
      ...(data.organization.name && { name: data.organization.name }),
      ...(data.organization.industry && { industry: data.organization.industry }),
      ...(data.organization.contractValue && { contractValue: data.organization.contractValue }),
    });
  }

  return {
    kind: "multi",
    ...contexts.reduce((acc, ctx) => {
      acc[ctx.kind] = ctx;
      return acc;
    }, {} as Record<string, LDContextCommon>),
  };
}

// Evaluate all flags
export async function evaluateFlags(
  context: LDContext | LDMultiKindContext
): Promise<Record<string, unknown>> {
  const client = getLDClient();
  
  const flagKeys = [
    "ai-query-provider",
    "pivot-table-access",
    "data-materialization",
    "webllm-access",
  ];

  const results: Record<string, unknown> = {};
  
  for (const key of flagKeys) {
    try {
      results[key] = await client.variation(key, context, null);
    } catch (error) {
      console.error(`Error evaluating flag ${key}:`, error);
      results[key] = null;
    }
  }

  return results;
}

// Specific flag helpers
export async function getAIProvider(
  context: LDContext | LDMultiKindContext
): Promise<{ provider: string; model?: string }> {
  const client = getLDClient();
  return await client.variation("ai-query-provider", context, { provider: "motherduck-ai" });
}

export async function hasPivotTableAccess(
  context: LDContext | LDMultiKindContext
): Promise<boolean> {
  const client = getLDClient();
  return await client.variation("pivot-table-access", context, false);
}

export async function hasDataMaterialization(
  context: LDContext | LDMultiKindContext
): Promise<boolean> {
  const client = getLDClient();
  return await client.variation("data-materialization", context, false);
}

export async function hasWebLLMAccess(
  context: LDContext | LDMultiKindContext
): Promise<boolean> {
  const client = getLDClient();
  return await client.variation("webllm-access", context, false);
}

// Track events
export function trackEvent(
  eventName: string,
  context: LDContext | LDMultiKindContext,
  data?: Record<string, unknown>,
  metricValue?: number
) {
  const client = getLDClient();
  client.track(eventName, context, data, metricValue);
}

// Cleanup
export async function closeLaunchDarkly(): Promise<void> {
  if (ldClient) {
    await ldClient.flush();
    await ldClient.close();
    ldClient = null;
    console.log("✅ LaunchDarkly SDK closed");
  }
}
