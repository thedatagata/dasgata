// components/Solutions.tsx
export default function Solutions() {
  const solutions = [
    {
      title: "Data Platform Development",
      description: "End-to-end development of modern data platforms",
      icon: "fa-database",
    },
    {
      title: "Lakehouse Architecture",
      description: "Design and implementation of scalable lakehouse architectures",
      icon: "fa-warehouse",
    },
    {
      title: "Datawarehouse Optimization",
      description: "Performance tuning and cost optimization of data warehouses",
      icon: "fa-tachometer-alt", 
    },
    {
      title: "DBT Implementation",
      description: "Building efficient, maintainable data transformations with dbt",
      icon: "fa-code-branch",
    },
    {
      title: "Staff Augmentation",
      description: "Expert resources to supplement your data team",
      icon: "fa-users",
    },
    {
      title: "Data Strategy",
      description: "Strategic roadmaps for your data initiatives",
      icon: "fa-map",
    }
  ];
 
  return (
    <div id="solutions" class="py-24 bg-[#172217]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div class="text-center mb-16">
          <h2 class="text-4xl lg:text-5xl font-bold text-[#F8F6F0] mb-4">
            Our Solutions
          </h2>
          <p class="text-xl text-[#F8F6F0]/70 max-w-3xl mx-auto">
            We offer a comprehensive range of services to help you build, optimize, and manage your data infrastructure.
          </p>
        </div>
        
        {/* Solutions grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {solutions.map((solution, index) => (
            <div
              key={index}
              class="group border border-[#90C137]/30 rounded-lg p-6 bg-[#F8F6F0]/5 hover:bg-[#90C137]/20 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div class="w-12 h-12 bg-[#90C137]/20 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#90C137]/40 transition-colors">
                <i class={`fas ${solution.icon} text-[#90C137] text-xl`}></i>
              </div>
              <h3 class="text-2xl font-light text-[#F8F6F0] group-hover:text-[#90C137] transition-colors mb-4">
                {solution.title}
              </h3>
              <p class="text-[#F8F6F0]/70 font-light">
                {solution.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}