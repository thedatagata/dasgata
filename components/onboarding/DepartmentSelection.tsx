// components/onboarding/DepartmentSelection.tsx
export default function DepartmentSelection() {
  const departments = [
    {
      name: "Marketing",
      icon: "fa-bullhorn",
      description: "Track campaigns, conversions, and customer acquisition",
      color: "from-purple-500 to-pink-500"
    },
    {
      name: "Sales",
      icon: "fa-chart-line",
      description: "Monitor pipeline, deals, and revenue performance",
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Product",
      icon: "fa-cube",
      description: "Analyze user behavior, features, and engagement",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const handleDepartmentSelect = (department: string) => {
    // Store in localStorage
    localStorage.setItem('selected_department', department);
    
    // TODO: Store in LaunchDarkly context
    
    // Redirect to metrics selection
    window.location.href = '/onboarding/metrics';
  };

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Progress indicator */}
      <div class="mb-12">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <div class="w-8 h-8 bg-[#90C137] rounded-full flex items-center justify-center text-[#172217] font-bold">
            1
          </div>
          <div class="w-16 h-1 bg-[#F8F6F0]/30"></div>
          <div class="w-8 h-8 bg-[#F8F6F0]/30 rounded-full flex items-center justify-center text-[#F8F6F0] font-bold">
            2
          </div>
          <div class="w-16 h-1 bg-[#F8F6F0]/30"></div>
          <div class="w-8 h-8 bg-[#F8F6F0]/30 rounded-full flex items-center justify-center text-[#F8F6F0] font-bold">
            3
          </div>
        </div>
        <p class="text-center text-[#F8F6F0]/70 text-sm">Step 1 of 3: Choose Your Department</p>
      </div>

      {/* Header */}
      <div class="text-center mb-16">
        <h1 class="text-4xl md:text-5xl font-bold text-[#F8F6F0] mb-4">
          Which department are you in?
        </h1>
        <p class="text-xl text-[#F8F6F0]/80 max-w-2xl mx-auto">
          This helps us recommend the right metrics and data sources for your needs.
        </p>
      </div>

      {/* Department Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <button
            key={dept.name}
            onClick={() => handleDepartmentSelect(dept.name)}
            class={`group relative bg-gradient-to-br ${dept.color} p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left overflow-hidden`}
          >
            {/* Background decoration */}
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            
            {/* Content */}
            <div class="relative">
              <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                <i class={`fas ${dept.icon} text-white text-2xl`}></i>
              </div>
              
              <h3 class="text-2xl font-bold text-white mb-2">
                {dept.name}
              </h3>
              
              <p class="text-white/90 font-light">
                {dept.description}
              </p>

              {/* Arrow indicator */}
              <div class="mt-4 flex items-center text-white/80 group-hover:text-white transition-colors">
                <span class="text-sm font-medium mr-2">Get Started</span>
                <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Skip option */}
      <div class="text-center mt-12">
        <a 
          href="/onboarding/metrics" 
          class="text-[#F8F6F0]/60 hover:text-[#90C137] transition-colors text-sm"
        >
          Skip this step →
        </a>
      </div>
    </div>
  );
}
