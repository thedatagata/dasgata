// utils/features.ts
import ldClient from "./launchDarkly.ts";
import { createContext, type PlanTier } from "./context.ts";
import { getKv } from "./db.ts";

/**
 * Feature flag keys used in LaunchDarkly
 */
export const FEATURES = {
  ADVANCED_ANALYTICS: "advanced-analytics",
  AI_INSIGHTS: "ai-insights",
  API_ACCESS: "api-access",
  UNLIMITED_SOURCES: "unlimited-sources",
  PRIORITY_SUPPORT: "priority-support",
  CUSTOM_DASHBOARDS: "custom-dashboards",
  SSO: "sso-access",
  EXPORT_DATA: "export-data",
} as const;

/**
 * User features interface
 */
export interface UserFeatures {
  advancedAnalytics: boolean;
  aiInsights: boolean;
  apiAccess: boolean;
  unlimitedSources: boolean;
  prioritySupport: boolean;
  customDashboards: boolean;
  ssoAccess: boolean;
  exportData: boolean;
}

/**
 * Get all features for a user based on their email
 */
export async function getUserFeatures(userEmail: string): Promise<UserFeatures> {
  const kv = getKv();
  const userRecord = await kv.get(["users", userEmail]);

  if (!userRecord?.value) {
    return getDefaultFeatures();
  }

  const user = userRecord.value as any;
  const planTier = user.planTier as PlanTier;

  if (!planTier) {
    return getDefaultFeatures();
  }

  const context = createContext(userEmail, planTier, user.email, user.name);

  const features: UserFeatures = {
    advancedAnalytics: await ldClient.variation(FEATURES.ADVANCED_ANALYTICS, context, false),
    aiInsights: await ldClient.variation(FEATURES.AI_INSIGHTS, context, false),
    apiAccess: await ldClient.variation(FEATURES.API_ACCESS, context, false),
    unlimitedSources: await ldClient.variation(FEATURES.UNLIMITED_SOURCES, context, false),
    prioritySupport: await ldClient.variation(FEATURES.PRIORITY_SUPPORT, context, false),
    customDashboards: await ldClient.variation(FEATURES.CUSTOM_DASHBOARDS, context, false),
    ssoAccess: await ldClient.variation(FEATURES.SSO, context, false),
    exportData: await ldClient.variation(FEATURES.EXPORT_DATA, context, false),
  };

  return features;
}

/**
 * Check if a user has access to a specific feature
 */
export async function hasFeature(
  userEmail: string,
  featureKey: keyof typeof FEATURES
): Promise<boolean> {
  const kv = getKv();
  const userRecord = await kv.get(["users", userEmail]);

  if (!userRecord?.value) {
    return false;
  }

  const user = userRecord.value as any;
  const planTier = user.planTier as PlanTier;

  if (!planTier) {
    return false;
  }

  const context = createContext(userEmail, planTier, user.email, user.name);
  return await ldClient.variation(FEATURES[featureKey], context, false);
}

/**
 * Default features (all disabled)
 */
function getDefaultFeatures(): UserFeatures {
  return {
    advancedAnalytics: false,
    aiInsights: false,
    apiAccess: false,
    unlimitedSources: false,
    prioritySupport: false,
    customDashboards: false,
    ssoAccess: false,
    exportData: false,
  };
}

/**
 * Get user's plan tier from email
 */
export async function getUserPlanTier(userEmail: string): Promise<PlanTier | null> {
  const kv = getKv();
  const userRecord = await kv.get(["users", userEmail]);

  if (!userRecord?.value) {
    return null;
  }

  return (userRecord.value as any).planTier || null;
}
