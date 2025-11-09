import { useEffect, useState } from "preact/hooks";
import * as LaunchDarkly from 'launchdarkly-node-client-sdk';

let ldClient: LaunchDarkly.LDClient | null = null;

export function useLaunchDarkly(userId: string) {
  const [client, setClient] = useState<LaunchDarkly.LDClient | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (ldClient) {
      setClient(ldClient);
      setInitialized(true);
      return;
    }

    const context: LaunchDarkly.LDContext = {
      kind: 'user',
      key: userId,
      anonymous: !userId
    };

    ldClient = LaunchDarkly.initialize(
      '6903daaf9c1eaa098f527121', 
      context
    );

    ldClient.waitForInitialization(5).then(() => {
      setClient(ldClient);
      setInitialized(true);
    }).catch(err => {
      console.error('LD init failed:', err);
    });
  }, [userId]);

  return { client, initialized };
}

export function trackMetric(name: string, value: number = 1, tags?: Record<string, string>) {
  if (!ldClient) return;
  
  ldClient.track(name, { value, ...tags });
}