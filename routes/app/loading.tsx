// routes/app/loading.tsx
import { Head } from "$fresh/runtime.ts";
import PieLoading from "../../islands/PieLoading.tsx";

export default function LoadingPage() {
  return (
    <>
      <Head>
        <title>Your Pie is Baking... | DATA_GATA</title>
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
        <PieLoading />
      </div>
    </>
  );
}
