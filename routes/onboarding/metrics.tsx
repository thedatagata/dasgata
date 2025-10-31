// routes/onboarding/metrics.tsx
import { Head } from "$fresh/runtime.ts";
import MetricsSelection from "../../islands/onboarding/MetricsSelection.tsx";

export default function MetricsPage() {
  return (
    <>
      <Head>
        <title>Select Your Metrics | DATA_GATA</title>
        <meta name="description" content="Choose the metrics that matter most to you" />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
        <MetricsSelection />
      </div>
    </>
  );
}
