// utils/context.ts
export type PlanTier = "trial" | "starter" | "premium";

export interface UserContext {
  kind: "user";
  key: string;  // user ID or email
  planTier: PlanTier;
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
    planTier,
    email,
    name,
  };
}