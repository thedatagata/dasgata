// components/Expertise.tsx
export default function ExpertiseSection() {
  const expertises = [
    {
      title: "Data Architecture",
      description: "Designing scalable, efficient data architectures",
      icon: "fa-sitemap",
    },
    {
      title: "Analytics Engineering",
      description: "Building robust, reusable data models with dbt",
      icon: "fa-chart-bar",
    },
    {
      title: "Data Integrations",
      description: "Connecting and syncing data across systems",
      icon: "fa-exchange-alt",
    },
    {
      title: "Data Quality",
      description: "Implementing comprehensive data quality frameworks",
      icon: "fa-check-circle",
    },
    {
      title: "Marketing Analytics",
      description: "Driving insights from marketing and product data",
      icon: "fa-bullseye",
    },
    {
      title: "Data Platforms",
      description: "Building scalable, unified data platforms",
      icon: "fa-database",
    }
  ];

  return (
    <div id="expertise" class="py-24 bg-[#F8F6F0]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Column */}
          <div class="relative hidden lg:block">
            <div class="sticky top-32">
              <div class="relative">
                <div class="absolute -top-6 -left-6 w-24 h-24 bg-[#90C137]/20 rounded-full"></div>
                <img
                  src="/cubicle.png"
                  alt="Office Cubicle"
                  class="w-full rounded-lg shadow-xl relative z-10 border-4 border-white"
                />
                <div class="absolute -bottom-6 -right-6 w-32 h-32 bg-[#172217]/10 rounded-full"></div>
              </div>
              <div class="mt-8 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                <h3 class="text-xl font-semibold text-[#172217] mb-2">Why Choose DATA_GATA?</h3>
                <p class="text-gray-600 mb-4">
                  We combine deep technical expertise with practical business knowledge to deliver solutions that not only work technically but drive real business value.
                </p>
              </div>
            </div>
          </div>
          
          {/* Content Column */}
          <div>
            <h2 class="text-4xl lg:text-5xl font-bold text-[#172217] mb-8">Our Expertise</h2>
            <p class="text-xl text-gray-600 max-w-3xl mb-12">
              With years of experience across diverse industries, our team brings deep expertise in all aspects of modern data stack implementation.
            </p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {expertises.map((expertise, idx) => (
                <div
                  key={idx}
                  class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                >
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 bg-[#90C137]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i class={`fas ${expertise.icon} text-[#90C137] text-xl`}></i>
                    </div>
                    <div>
                      <h3 class="text-xl font-medium text-[#172217]">
                        {expertise.title}
                      </h3>
                      <p class="text-gray-600 mt-2">{expertise.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}