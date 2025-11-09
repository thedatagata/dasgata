// routes/app/index.tsx
import { Head } from "$fresh/runtime.ts";

export default function AppPage() {
  return (
    <>
      <Head>
        <title>DATA_GATA | Your Data Platform</title>
        <meta name="description" content="Your personal data platform" />
        <meta http-equiv="refresh" content="3;url=/app/dashboard" />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018] flex items-center justify-center">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div class="mb-8">
            <div class="w-32 h-32 mx-auto mb-6 bg-[#90C137]/20 rounded-full flex items-center justify-center">
              <i class="fas fa-rocket text-[#90C137] text-6xl"></i>
            </div>
            
            <h1 class="text-5xl md:text-6xl font-bold text-[#F8F6F0] mb-6">
              Welcome to DATA_<span class="text-[#90C137]">GATA</span>!
            </h1>
            
            <p class="text-xl text-[#F8F6F0]/80 mb-8 max-w-2xl mx-auto">
              Your personal data platform is being set up. We're connecting your data sources and preparing your analytics environment.
            </p>
            
            <div class="bg-[#F8F6F0]/10 backdrop-blur-sm rounded-lg p-8 mb-8">
              <h2 class="text-2xl font-bold text-[#90C137] mb-4">What's Next?</h2>
              <ul class="text-left text-[#F8F6F0]/90 space-y-3 max-w-xl mx-auto">
                <li class="flex items-start">
                  <i class="fas fa-check text-[#90C137] mr-3 mt-1"></i>
                  <span>Your data pipelines are being configured based on your selected sources</span>
                </li>
                <li class="flex items-start">
                  <i class="fas fa-check text-[#90C137] mr-3 mt-1"></i>
                  <span>Analytics models are being generated for your chosen metrics</span>
                </li>
                <li class="flex items-start">
                  <i class="fas fa-check text-[#90C137] mr-3 mt-1"></i>
                  <span>Your lakehouse architecture is being deployed</span>
                </li>
              </ul>
            </div>
            
            <div class="space-y-4">
              <p class="text-[#F8F6F0]/70">
                The full query interface (Phase 6-10) is coming soon!
              </p>
              
              <div class="flex justify-center gap-4">
                <a 
                  href="/onboarding/department" 
                  class="px-6 py-3 border border-[#90C137] text-[#90C137] rounded-md hover:bg-[#90C137]/10 transition-colors"
                >
                  ← Modify Setup
                </a>
                
                <a 
                  href="/" 
                  class="px-6 py-3 bg-[#90C137] text-[#172217] rounded-md font-medium hover:bg-[#a0d147] transition-colors"
                >
                  Back to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
