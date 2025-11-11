// routes/index.tsx
import { Head } from "$fresh/runtime.ts";
import Nav from "../../components/Nav.tsx";
import Footer from "../../components/Footer.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>DATA_GATA | Choose Your Plan</title>
      </Head>
      
      <Nav />
      <main class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018] py-32">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-16">
            <h1 class="text-5xl font-bold text-[#F8F6F0] mb-4">
              Choose Your Plan
            </h1>
            <p class="text-xl text-[#F8F6F0]/80">
              Start with Base or unlock Premium features
            </p>
          </div>

          <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Base Plan */}
            <div class="bg-[#F8F6F0] rounded-lg p-8 shadow-xl">
              <h2 class="text-3xl font-bold text-[#172217] mb-4">Base</h2>
              <div class="text-4xl font-bold text-[#90C137] mb-6">Free</div>
              <ul class="space-y-3 mb-8 text-[#172217]">
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-[#90C137] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Stream data from MotherDuck
                </li>
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-[#90C137] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  MotherDuck AI queries
                </li>
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-[#90C137] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Basic visualizations
                </li>
              </ul>
              <a 
                href="/dashboard?plan=base"
                class="block w-full text-center py-3 bg-[#172217] text-[#F8F6F0] font-semibold rounded-md hover:bg-[#2a3a2a] transition-colors"
              >
                Start with Base
              </a>
            </div>

            {/* Premium Plan */}
            <div class="bg-[#90C137] rounded-lg p-8 shadow-xl border-4 border-[#90C137] relative">
              <div class="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#172217] text-[#90C137] px-4 py-1 rounded-full text-sm font-bold">
                RECOMMENDED
              </div>
              <h2 class="text-3xl font-bold text-[#172217] mb-4">Premium</h2>
              <div class="text-4xl font-bold text-[#172217] mb-6">$49/mo</div>
              <ul class="space-y-3 mb-8 text-[#172217]">
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-[#172217] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Everything in Base
                </li>
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-[#172217] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Materialize to DuckDB-WASM
                </li>
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-[#172217] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  WebLLM natural language queries
                </li>
                <li class="flex items-start">
                  <svg class="w-6 h-6 text-[#172217] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Advanced analytics
                </li>
              </ul>
              <a 
                href="/loading?plan=premium"
                class="block w-full text-center py-3 bg-[#172217] text-[#90C137] font-semibold rounded-md hover:bg-[#0d110d] transition-colors"
              >
                Get Premium
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
