// islands/PageTracker.tsx
import { useEffect } from "preact/hooks";
import { trackPageView } from "../utils/dataLayer.ts";

interface PageTrackerProps {
  pageTitle: string;
}

export default function PageTracker({ pageTitle }: PageTrackerProps) {
  useEffect(() => {
    // Only run in the browser
    if (typeof window !== "undefined") {
      // Track page view using the dataLayer
      trackPageView(globalThis.location.href, pageTitle);
      
      // Add URL change listener for SPA navigation
      const handleRouteChange = () => {
        trackPageView(globalThis.location.href, document.title);
      };
      
      globalThis.addEventListener('popstate', handleRouteChange);
      
      // Cleanup listener on unmount
      return () => {
        globalThis.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [pageTitle]);

  // This component doesn't render anything
  return null;
}