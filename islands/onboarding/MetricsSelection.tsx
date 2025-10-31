// islands/onboarding/MetricsSelection.tsx
import { useState } from "preact/hooks";

export default function MetricsSelection() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  const metrics = [
    { name: "Revenue", icon: "fa-dollar-sign", description: "Track total revenue and growth" },
    { name: "Conversion Rate", icon: "fa-percentage", description: "Monitor funnel conversion rates" },
    { name: "Customer Acquisition Cost", icon: "fa-user-plus", description: "CAC and cost efficiency" },
    { name: "Active Users", icon: "fa-users", description: "Daily and monthly active users" },
    { name: "Churn Rate", icon: "fa-arrow-down", description: "Customer retention and churn" }
  ];

  const handleToggleMetric = (metricName: string) => {
    if (selectedMetrics.includes(metricName)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metricName));
    } else {
      if (selectedMetrics.length < 5) {
        setSelectedMetrics([...selectedMetrics, metricName]);
      }
    }
  };

  const handleContinue = () => {
    localStorage.setItem('selected_metrics', JSON.stringify(selectedMetrics));
    window.location.href = '/onboarding/sources';
  };

  const handleBack = () => {
    window.location.href = '/onboarding/department';
  };

  return (
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Progress indicator */}
      <div class="mb-12">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <div class="w-8 h-8 bg-[#90C137] rounded-full flex items-center justify-center text-[#172217] font-bold">1</div>
          <div class="w-16 h-1 bg-[#90C137]"></div>
          <div class="w-8 h-8 bg-[#90C137] rounded-full flex items-center justify-center text-[#172217] font-bold">2</div>
          <div class="w-16 h-1 bg-[#F8F6F0]/30"></div>
          <div class="w-8 h-8 bg-[#F8F6F0]/30 rounded-full flex items-center justify-center text-[#F8F6F0] font-bold">3</div>
        </div>
        <p class="text-center text-[#F8F6F0]/70 text-sm">Step 2 of 3: Choose Your Metrics</p>
      </div>

      {/* Header */}
      <div class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-[#F8F6F0] mb-4">What metrics matter most?</h1>
        <p class="text-xl text-[#F8F6F0]/80">Select 2-5 metrics to track (choose at least 2)</p>
      </div>

      {/* Metric Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {metrics.map((metric) => {
          const isSelected = selectedMetrics.includes(metric.name);
          return (
            <button
              key={metric.name}
              onClick={() => handleToggleMetric(metric.name)}
              class={`p-6 rounded-lg border-2 transition-all ${
                isSelected ? 'bg-[#90C137]/20 border-[#90C137] shadow-lg scale-105' : 'bg-[#F8F6F0]/5 border-[#F8F6F0]/30 hover:border-[#90C137]/50'
              }`}
            >
              <div class="flex items-start justify-between mb-3">
                <div class={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#90C137]' : 'bg-[#F8F6F0]/10'}`}>
                  <i class={`fas ${metric.icon} text-xl ${isSelected ? 'text-[#172217]' : 'text-[#90C137]'}`}></i>
                </div>
                {isSelected && (
                  <div class="w-6 h-6 bg-[#90C137] rounded-full flex items-center justify-center">
                    <i class="fas fa-check text-[#172217] text-sm"></i>
                  </div>
                )}
              </div>
              <h3 class="text-lg font-semibold text-[#F8F6F0] mb-2">{metric.name}</h3>
              <p class="text-[#F8F6F0]/70 text-sm">{metric.description}</p>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div class="flex justify-between">
        <button onClick={handleBack} class="px-6 py-3 border border-[#F8F6F0]/30 text-[#F8F6F0] rounded-md hover:bg-[#F8F6F0]/10">← Back</button>
        <button onClick={handleContinue} disabled={selectedMetrics.length < 2}
          class={`px-8 py-3 rounded-md font-medium ${selectedMetrics.length >= 2 ? 'bg-[#90C137] text-[#172217] hover:bg-[#a0d147] shadow-lg' : 'bg-[#F8F6F0]/20 text-[#F8F6F0]/40 cursor-not-allowed'}`}>
          Continue →
        </button>
      </div>
    </div>
  );
}
