import { useState } from "preact/hooks";

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  color: string;
  recommended?: boolean;
}

export default function PlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const plans: Plan[] = [
    {
      id: "base",
      name: "Base",
      price: "$49/month",
      features: [
        "Streaming data from MotherDuck",
        "MotherDuck AI query generation",
        "Basic analytics & visualizations",
        "Up to 100,000 events/month",
        "Community support"
      ],
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "premium",
      name: "Premium",
      price: "$199/month",
      features: [
        "Everything in Base, plus:",
        "WebLLM AI-powered insights",
        "DuckDB-WASM materialization",
        "Advanced semantic layer",
        "Unlimited events",
        "Priority support",
        "API access"
      ],
      color: "from-[#90C137] to-[#186018]",
      recommended: true
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      });

      if (response.ok) {
        window.location.href = planId === 'premium' ? '/app/loading' : '/app/dashboard';
      } else {
        alert('Error selecting plan. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="text-center mb-16">
        <h1 class="text-5xl md:text-6xl font-bold text-[#F8F6F0] mb-4">
          Choose Your Plan
        </h1>
        <p class="text-xl text-[#F8F6F0]/80 max-w-2xl mx-auto">
          Start your analytics journey with the plan that fits your needs
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            class={`relative bg-gradient-to-br ${plan.color} p-8 rounded-2xl shadow-2xl transform transition-all duration-300 hover:-translate-y-2 ${
              selectedPlan === plan.id ? 'ring-4 ring-white' : ''
            }`}
          >
            {plan.recommended && (
              <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span class="bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full">
                  RECOMMENDED
                </span>
              </div>
            )}

            <div class="text-center mb-6">
              <h3 class="text-3xl font-bold text-white mb-2">{plan.name}</h3>
              <p class="text-2xl text-white/90 font-light">{plan.price}</p>
            </div>

            <ul class="space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} class="flex items-start text-white/90">
                  <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePlanSelect(plan.id)}
              disabled={isLoading}
              class={`w-full py-3 px-6 rounded-lg font-bold text-lg transition-all ${
                isLoading && selectedPlan === plan.id
                  ? 'bg-white/50 cursor-wait'
                  : 'bg-white text-gray-900 hover:bg-gray-100 active:scale-95'
              }`}
            >
              {isLoading && selectedPlan === plan.id ? 'Loading...' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}