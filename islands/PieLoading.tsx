// islands/PieLoading.tsx
import { useEffect } from "preact/hooks";

export default function PieLoading() {
  useEffect(() => {
    // Redirect to dashboard after 4 seconds
    const timer = setTimeout(() => {
      window.location.href = '/app/dashboard';
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div class="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Animated Pizza Oven */}
      <div class="mb-12 relative">
        <div class="w-48 h-48 relative animate-bounce">
          <div class="absolute inset-0 bg-[#90C137] rounded-full opacity-20 animate-ping"></div>
          <div class="absolute inset-4 bg-gradient-to-br from-[#90C137] to-[#a0d147] rounded-full flex items-center justify-center shadow-2xl">
            <svg class="w-24 h-24 text-[#172217] animate-spin" style="animation-duration: 3s;" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/>
              <path d="M10 5a5 5 0 00-5 5h2a3 3 0 016 0h2a5 5 0 00-5-5z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Loading Text */}
      <div class="text-center max-w-2xl">
        <h1 class="text-5xl md:text-6xl font-bold text-[#F8F6F0] mb-6">
          Your pie is in the oven! 🥧
        </h1>
        
        <p class="text-xl text-[#F8F6F0]/90 mb-8 font-light">
          We're preparing your personal data platform with your custom metrics and data sources.
        </p>

        {/* Progress dots */}
        <div class="flex items-center justify-center space-x-2 mb-8">
          <div class="w-3 h-3 bg-[#90C137] rounded-full animate-pulse"></div>
          <div class="w-3 h-3 bg-[#90C137] rounded-full animate-pulse" style="animation-delay: 0.2s;"></div>
          <div class="w-3 h-3 bg-[#90C137] rounded-full animate-pulse" style="animation-delay: 0.4s;"></div>
        </div>

        {/* Fun loading messages */}
        <div class="text-[#F8F6F0]/70 space-y-2">
          <p class="animate-fadeIn">✨ Connecting your data sources...</p>
          <p class="animate-fadeIn" style="animation-delay: 1s;">📊 Setting up your metrics...</p>
          <p class="animate-fadeIn" style="animation-delay: 2s;">🎯 Customizing your experience...</p>
          <p class="animate-fadeIn" style="animation-delay: 3s;">🚀 Almost ready!</p>
        </div>

        <p class="text-sm text-[#F8F6F0]/50 mt-12">
          This usually takes just a few seconds...
        </p>
      </div>
    </div>
  );
}
