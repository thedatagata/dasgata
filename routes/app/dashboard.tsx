// routes/app/dashboard.tsx
import { PageProps } from "$fresh/server.ts";
import DashboardData from "../../islands/DashboardData.tsx";  // Changed from ../islands

export default function DashboardPage(props: PageProps) {
  const motherDuckToken = Deno.env.get("MOTHERDUCK_TOKEN") || "";

  if (!motherDuckToken) {
    return (
      <div class="p-8">
        <div class="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h2 class="font-bold text-yellow-800">Configuration Required</h2>
          <p class="text-yellow-700 mt-2">
            Please set the MOTHERDUCK_TOKEN environment variable.
          </p>
          <pre class="mt-2 bg-yellow-100 p-2 rounded text-sm">
            export MOTHERDUCK_TOKEN="your_token_here"
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto py-6 px-4">
          <h1 class="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p class="mt-2 text-gray-600">
            Powered by DuckDB-WASM + MotherDuck
          </p>
        </div>
      </header>

      <main class="max-w-7xl mx-auto py-6 px-4">
        <DashboardData motherDuckToken={motherDuckToken} />
      </main>
    </div>
  );
}