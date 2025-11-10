import { PageProps } from "$fresh/server.ts";
import DashboardTabs from "../../islands/DashboardTabs.tsx";

export default function DashboardPage(props: PageProps) {
  // Token is automatically loaded from .env file via $std/dotenv/load.ts in dev.ts
  const motherDuckToken = Deno.env.get("MOTHERDUCK_TOKEN") || "";

  if (!motherDuckToken) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018] p-8">
        <div class="max-w-2xl mx-auto">
          <div class="bg-[#90C137]/10 border-2 border-[#90C137] rounded-lg p-6">
            <h2 class="font-bold text-[#90C137] text-2xl">Configuration Required</h2>
            <p class="text-[#F8F6F0]/90 mt-2">
              Please set the MOTHERDUCK_TOKEN environment variable in your .env file.
            </p>
            <pre class="mt-4 bg-[#172217] p-4 rounded-lg text-sm text-[#90C137] border border-[#90C137]/30">
              MOTHERDUCK_TOKEN="your_token_here"
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018]">
      {/* Nav Bar */}
      <nav class="fixed w-full z-50 bg-[#172217]/95 backdrop-blur-sm shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            {/* Logo */}
            <a href="/" class="flex items-center space-x-2">
              <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-[#90C137]">
                <img 
                  src="/nerdy_alligator_headshot.png" 
                  alt="DATA_GATA Logo" 
                  class="w-full h-full object-cover"
                />
              </div>
              <span class="text-xl font-bold text-[#F8F6F0]">
                DATA_<span class="text-[#90C137]">GATA</span>
              </span>
            </a>
            
            {/* Right side */}
            <div class="flex items-center space-x-4">
              <span class="text-[#F8F6F0]/70 text-sm">Analytics Dashboard</span>
              <a 
                href="/" 
                class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors text-sm font-medium"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header class="pt-24 pb-8 px-4">
        <div class="max-w-7xl mx-auto">
          <div class="inline-block px-3 py-1 bg-[#90C137]/20 border border-[#90C137]/30 rounded-full text-[#90C137] text-sm font-medium mb-4">
            Powered by DuckDB-WASM + MotherDuck
          </div>
          <h1 class="text-4xl md:text-5xl font-bold text-[#F8F6F0] mb-3">
            Analytics Dashboard
          </h1>
          <p class="text-lg text-[#F8F6F0]/80 max-w-3xl">
            Explore your data with interactive tools. Ask questions, create pivots, and visualize trends.
          </p>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 pb-12">
        <DashboardTabs motherDuckToken={motherDuckToken} />
      </main>
    </div>
  );
}
