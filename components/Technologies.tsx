// components/Technologies.tsx
export default function TechnologiesSection() {
  const techCategories = [
    {
      category: "Compute Engines",
      icon: "fa-server",
      description: "High-performance query engines for data processing",
      tools: ["Snowflake", "BigQuery", "DuckDB"]
    },
    {
      category: "Data Orchestration",
      icon: "fa-cogs",
      description: "Tools for orchestrating and transforming data",
      tools: ["Dagster", "dbt", "SDF Labs"]
    },
    {
      category: "Table Formats",
      icon: "fa-table",
      description: "Open table formats for data lakes",
      tools: ["Apache Iceberg", "Delta Lake"]
    },
    {
      category: "Data Integration",
      icon: "fa-plug",
      description: "Connect data sources and destinations",
      tools: ["Airbyte", "DLT", "Fivetran"]
    }
  ];

  return (
    <div id="technologies" class="py-24 bg-[#172217]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with image */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 class="text-4xl lg:text-5xl font-bold text-[#F8F6F0] mb-4">
              Technologies We Recommend
            </h2>
            <p class="text-xl text-[#F8F6F0]/70">
              We're experts in the most powerful tools in modern data infrastructure. Here's what we typically recommend to our clients for building robust, scalable data platforms.
            </p>
          </div>
          <div class="hidden lg:block">
            <img 
              src="/water_cooler.png" 
              alt="Water Cooler" 
              class="w-full rounded-lg shadow-xl border-4 border-[#172217]"
            />
          </div>
        </div>
        
        {/* Technologies grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          {techCategories.map((category, idx) => (
            <div
              key={idx}
              class="bg-[#F8F6F0]/5 border border-[#F8F6F0]/20 rounded-lg p-6 transition-colors hover:bg-[#F8F6F0]/10"
            >
              <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 bg-[#90C137]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i class={`fas ${category.icon} text-[#90C137] text-xl`}></i>
                </div>
                <h3 class="text-xl font-semibold text-[#90C137]">
                  {category.category}
                </h3>
              </div>
              
              <p class="text-[#F8F6F0]/80 mb-4">
                {category.description}
              </p>
              
              <div class="space-y-2 mb-4">
                {category.tools.map((tool, toolIdx) => (
                  <div 
                    key={toolIdx} 
                    class="flex items-center text-[#F8F6F0]/80"
                  >
                    <svg class="w-4 h-4 mr-2 text-[#90C137]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {tool}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}