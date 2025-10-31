// routes/onboarding/department.tsx
import { Head } from "$fresh/runtime.ts";
import DepartmentSelection from "../../islands/onboarding/DepartmentSelection.tsx";

export default function DepartmentPage() {
  return (
    <>
      <Head>
        <title>Select Your Department | DATA_GATA</title>
        <meta name="description" content="Choose your department to get started with DATA_GATA" />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
        <DepartmentSelection />
      </div>
    </>
  );
}
