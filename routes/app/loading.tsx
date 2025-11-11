import { Head } from "$fresh/runtime.ts";
import WebLLMLoader from "../../islands/WebLLMLoader.tsx";

export default function Loading() {
  return (
    <>
      <Head>
        <title>Loading Premium Features...</title>
      </Head>
      <WebLLMLoader />
    </>
  );
}
