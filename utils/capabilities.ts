// utils/capabilities.ts
import ldClient from "./launchDarkly.ts";
import { createContext, type PlanTier } from "./context.ts";
import { getKv } from "./db.ts";

export interface PlanCapabilities {
  materialization: boolean;
  webllm: boolean;
  metadataStorage: boolean;
  schemas: string[];
  dataSourceMode: "streaming-only" | "both";
  features: {
    dataCatalog: boolean;
    aiQuery: boolean;
    pivotTable: boolean;
    timeSeries: boolean;
  };
  aiProviders: string[];
}

const defaultCapabilities: PlanCapabilities = {
  materialization: false,
  webllm: false,
  metadataStorage: false,
  schemas: [],
  dataSourceMode: "streaming-only",
  features: {
    dataCatalog: true,
    aiQuery: false,
    pivotTable: false,
    timeSeries: false,
  },
  aiProviders: [],
};

export async function getUserCapabilities(userEmail: string): Promise<PlanCapabilities> {
  const kv = getKv();
  const userRecord = await kv.get(["users", userEmail]);

  if (!userRecord?.value) {
    return defaultCapabilities;
  }

  const user = userRecord.value as any;
  const planTier = user.planTier as PlanTier;

  if (!planTier) {
    return defaultCapabilities;
  }

  const context = createContext(userEmail, planTier, user.email, user.name);
  
  return await ldClient.variation("plan-capabilities", context, defaultCapabilities);
}