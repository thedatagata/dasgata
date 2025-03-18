// components/home/Testimonials.tsx
export default function Testimonials() {
  const testimonials = [
    {
      quote: "DATA_GATA helped us modernize our data platform with Apache Iceberg and Dagster. The expertise they brought was invaluable and our team learned so much during the implementation.",
      author: "Sarah Chen",
      title: "Director of Analytics, TechVista Inc."
    },
    {
      quote: "We were drowning in a true data swamp before bringing in DATA_GATA. They built us a lakehouse architecture that transformed how we use data across our entire organization.",
      author: "Michael Rodriguez",
      title: "CTO, E-commerce Solutions"
    }
  ];

  return (
    <section class="py-24 bg-[#172217] relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div class="text-center mb-16">
          <h2 class="text-4xl lg:text-5xl font-bold text-[#F8F6F0] mb-4">
            What Our Clients Say
          </h2>
          <p class="text-xl text-[#F8F6F0]/70 max-w-3xl mx-auto">
            We've helped organizations transform their data platforms. Here's what they have to say about working with us.
          </p>
        </div>
        
        {/* Testimonials grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} class="bg-[#F8F6F0]/5 border border-[#F8F6F0]/20 rounded-lg p-6 hover:bg-[#F8F6F0]/10 transition-colors relative">
              {/* Quote content */}
              <div class="relative z-10">
                <p class="text-[#F8F6F0]/90 italic mb-6 relative">
                  "{testimonial.quote}"
                </p>
                
                {/* Author info */}
                <div class="flex items-center mt-4">
                  <div class="w-12 h-12 rounded-full bg-[#90C137]/20 flex items-center justify-center mr-4">
                    <i class="fas fa-user text-[#90C137]"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-[#F8F6F0]">{testimonial.author}</h4>
                    <p class="text-[#F8F6F0]/70 text-sm">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}