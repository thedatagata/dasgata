// islands/onboarding/SourcesSelection.tsx
import { useState } from "preact/hooks";

export default function SourcesSelection() {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const sources = {
    "Marketing": [
      { name: "Google Analytics 4", icon: "fa-chart-bar", description: "Website analytics" },
      { name: "HubSpot", icon: "fa-hubspot", description: "Marketing automation" },
      { name: "Mailchimp", icon: "fa-envelope", description: "Email campaigns" }
    ],
    "Sales": [
      { name: "Salesforce", icon: "fa-cloud", description: "CRM and pipeline" },
      { name: "HubSpot CRM", icon: "fa-hubspot", description: "Sales tracking" },
      { name: "Pipedrive", icon: "fa-pipe", description: "Pipeline management" }
    ],
    "Product": [
      { name: "Mixpanel", icon: "fa-chart-line", description: "Product analytics" },
      { name: "Amplitude", icon: "fa-wave-square", description: "User behavior" },
      { name: "Segment", icon: "fa-project-diagram", description: "Customer data" }
    ]
  };

  const handleToggleSource = (sourceName: string) => {
    if (selectedSources.includes(sourceName)) {
      setSelectedSources(selectedSources.filter(s => s !== sourceName));
    } else {
      setSelectedSources([...selectedSources, sourceName]);
    }
  };

  const handleContinue = async () => {
    // Get all onboarding data from localStorage
    const department = localStorage.getItem('selected_department');
    const metrics = JSON.parse(localStorage.getItem('selected_metrics') || '[]');
    const sources = selectedSources;

    // Save to database
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, metrics, sources })
      });

      if (response.ok) {
        // Clear localStorage
        localStorage.removeItem('selected_department');
        localStorage.removeItem('selected_metrics');
        localStorage.removeItem('selected_sources');
        
        // Redirect to loading screen
        window.location.href = '/app/loading';
      } else {
        console.error('Failed to save onboarding data');
        alert('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error saving onboarding:', error);
      alert('Connection error. Please try again.');
    }
  };

  const handleBack = () => {
    window.location.href = '/onboarding/metrics';
  };

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="mb-12">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <div class="w-8 h-8 bg-[#90C137] rounded-full flex items-center justify-center text-[#172217] font-bold">1</div>
          <div class="w-16 h-1 bg-[#90C137]"></div>
          <div class="w-8 h-8 bg-[#90C137] rounded-full flex items-center justify-center text-[#172217] font-bold">2</div>
          <div class="w-16 h-1 bg-[#90C137]"></div>
          <div class="w-8 h-8 bg-[#90C137] rounded-full flex items-center justify-center text-[#172217] font-bold">3</div>
        </div>
        <p class="text-center text-[#F8F6F0]/70 text-sm">Step 3 of 3: Connect Data Sources</p>
      </div>

      <div class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-[#F8F6F0] mb-4">Choose your data sources</h1>
        <p class="text-xl text-[#F8F6F0]/80">Select the tools you want to analyze</p>
      </div>

      {Object.entries(sources).map(([category, categorySource]) => (
        <div key={category} class="mb-8">
          <h2 class="text-2xl font-bold text-[#F8F6F0] mb-4">{category}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categorySource.map((source) => {
              const isSelected = selectedSources.includes(source.name);
              return (
                <button key={source.name} onClick={() => handleToggleSource(source.name)}
                  class={`p-6 rounded-lg border-2 transition-all text-left ${isSelected ? 'bg-[#90C137]/20 border-[#90C137] shadow-lg' : 'bg-[#F8F6F0]/5 border-[#F8F6F0]/30 hover:border-[#90C137]/50'}`}>
                  <div class="flex items-start justify-between mb-3">
                    <div class={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#90C137]' : 'bg-[#F8F6F0]/10'}`}>
                      <i class={`fas ${source.icon} text-xl ${isSelected ? 'text-[#172217]' : 'text-[#90C137]'}`}></i>
                    </div>
                    {isSelected && (
                      <div class="w-6 h-6 bg-[#90C137] rounded-full flex items-center justify-center">
                        <i class="fas fa-check text-[#172217] text-sm"></i>
                      </div>
                    )}
                  </div>
                  <h3 class="text-lg font-semibold text-[#F8F6F0] mb-1">{source.name}</h3>
                  <p class="text-[#F8F6F0]/70 text-sm">{source.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div class="flex justify-between mt-12">
        <button onClick={handleBack} class="px-6 py-3 border border-[#F8F6F0]/30 text-[#F8F6F0] rounded-md hover:bg-[#F8F6F0]/10">← Back</button>
        <button onClick={handleContinue} disabled={selectedSources.length === 0}
          class={`px-8 py-3 rounded-md font-medium ${selectedSources.length > 0 ? 'bg-[#90C137] text-[#172217] hover:bg-[#a0d147] shadow-lg' : 'bg-[#F8F6F0]/20 text-[#F8F6F0]/40 cursor-not-allowed'}`}>
          Get Started →
        </button>
      </div>
    </div>
  );
}
