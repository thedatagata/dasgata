// components/Hero.tsx
export default function Hero() {
  return (
    <div class="relative min-h-screen flex items-center bg-gradient-to-br from-[#172217] to-[#186018] overflow-hidden">
      {/* Background image with overlay */}
      <div class="absolute inset-0">
        <img 
          src="/nerdy_alligator_swamp.png" 
          alt="Data Swamp" 
          class="w-full h-full object-cover opacity-30"
        />
        <div class="absolute inset-0 bg-[#172217] opacity-60 mix-blend-multiply"></div>
      </div>
      
      {/* Content */}
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 pt-40">
        <div class="space-y-16">
          {/* Hero Title and Tagline */}
          <div class="space-y-6 max-w-3xl">
            <div class="inline-block px-3 py-1 bg-[#90C137]/20 border border-[#90C137]/30 rounded-full text-[#90C137] text-sm font-medium mb-2">
              Data Architecture Consulting
            </div>
            <h1 class="text-5xl md:text-7xl lg:text-8xl font-extrabold text-[#F8F6F0] tracking-tight leading-none">
              DATA_<span class="text-[#90C137]">GATA</span>
            </h1>
            <p class="text-lg md:text-xl text-[#F8F6F0]/90 max-w-2xl font-light leading-relaxed">
              Navigating the data swamp so you don't have to. We're the experts that evolved in messy data environments to help you build scalable, reliable data platforms.
            </p>
            <div class="flex flex-wrap gap-4 pt-4">
              <a href="#contact" class="inline-flex items-center px-6 py-3 bg-[#90C137] text-[#172217] font-medium rounded-md hover:bg-[#a0d147] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Schedule a Consultation
                <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </a>
              <a href="#about" class="inline-flex items-center px-6 py-3 border border-[#F8F6F0]/30 text-[#F8F6F0] font-medium rounded-md hover:bg-[#F8F6F0]/10 transition-colors">
                Learn More
              </a>
            </div>
          </div>

          {/* About Section */}
          <div id="about" class="space-y-8 max-w-4xl pt-16 scroll-mt-32">
            <h2 class="text-3xl md:text-4xl font-bold text-[#90C137]">The DATA_GATA Legend</h2>

            <div class="flex flex-col md:flex-row gap-8 items-start">
              <img
                src="/nerdy_alligator_headshot.png"
                alt="Nerdy Alligator"
                class="w-40 h-40 md:w-64 md:h-64 object-cover rounded-lg shadow-2xl transform -rotate-3 border-4 border-[#90C137]"
              />
              <div class="space-y-6">
                <p class="text-xl text-[#F8F6F0]/90 font-light leading-relaxed">
                  According to Silicon Valley folklore, some early stage start-ups have reported to have encountered what can only be described as the "DATA_GATA". 
                </p>
                <p class="text-xl text-[#F8F6F0]/90 font-light leading-relaxed">
                  It is rumored that this mysterious creature evolved from the sales team of a bootstrapped start-up that sold data-products that did not exist to raise capital.
                </p>
                <p class="text-xl text-[#F8F6F0]/90 font-light leading-relaxed">
                  In this environment, this once young ambitious college dropout rose from cold calling to building data products and now dedicates his career to helping others avoid adopting a data-swamp in the pursuit of a single source of truth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}