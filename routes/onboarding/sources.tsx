// routes/onboarding/sources.tsx
import { Head } from "$fresh/runtime.ts";
import SourcesSelection from "../../islands/onboarding/SourcesSelection.tsx";

export default function SourcesPage() {
  return (
    <>
      <Head>
        <title>Connect Your Data Sources | DATA_GATA</title>
        <meta name="description" content="Select the data sources you want to connect" />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
        <SourcesSelection />
      </div>
    </>
  );
}
