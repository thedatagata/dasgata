// utils/context.ts
export type PlanTier = "trial" | "starter" | "premium";

export interface UserContext {
  kind: "user";
  key: string;
  plan: PlanTier;  // Changed from planTier to match LD flag targeting
  email?: string;
  name?: string;
}

export function createContext(
  userId: string,
  planTier: PlanTier,
  email?: string,
  name?: string
): UserContext {
  return {
    kind: "user",
    key: userId,
    plan: planTier,  // Changed from planTier
    email,
    name,
  };
}