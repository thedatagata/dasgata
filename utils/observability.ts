import { LDObserve } from "@launchdarkly/observability-node";

export function trackFeatureUsage(featureName: string, userId: string) {
  LDObserve.recordMetric({
    name: "feature.used",
    value: 1,
    tags: [
      { name: "feature", value: featureName },
      { name: "user", value: userId }
    ]
  });
}

export function trackOnboardingStep(step: string, userId: string) {
  LDObserve.recordMetric({
    name: "onboarding.step_completed",
    value: 1,
    tags: [
      { name: "step", value: step },
      { name: "user", value: userId }
    ]
  });
}

export function trackQueryExecution(tableSource: 'browser' | 'motherduck', queryType: string, userId: string) {
  LDObserve.recordMetric({
    name: "query.executed",
    value: 1,
    tags: [
      { name: "source", value: tableSource },
      { name: "type", value: queryType },
      { name: "user", value: userId }
    ]
  });
}