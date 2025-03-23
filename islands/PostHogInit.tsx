// islands/PostHogInit.tsx
import { useEffect } from "preact/hooks";
import posthog from "posthog-js";

interface PostHogInitProps {
  apiKey: string;
  apiHost: string;
}

export default function PostHogInit({ apiKey, apiHost }: PostHogInitProps) {
  useEffect(() => {
    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'always'
    });
  }, []);
  
  return null;
}