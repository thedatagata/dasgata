// routes/onboarding/plans.tsx
import { Head } from "$fresh/runtime.ts";
import PlanSelection from "../../islands/onboarding/PlanSelection.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>DATA_GATA | Choose Your Plan</title>
      </Head>
      <main class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018] py-32">
        <PlanSelection />
      </main>
    </>
  );
}