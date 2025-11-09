// routes/onboarding/plans.tsx
import { Head } from "$fresh/runtime.ts";
import PlanSelection from "../../islands/onboarding/PlanSelection.tsx";

export default function PlansPage() {
  return (
    <>
      <Head>
        <title>Choose Your Plan | DATA_GATA</title>
        <meta name="description" content="Select the plan that fits your needs" />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
        <PlanSelection />
      </div>
    </>
  );
}