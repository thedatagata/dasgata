// components/Nav.tsx
import MobileMenu from "../islands/MobileMenu.tsx";

export default function Nav() {
  return (
    <nav class="fixed w-full z-50 transition-all duration-300 bg-[#172217]/95 backdrop-blur-sm py-3 shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center">
          {/* Logo */}
          <a href="/" class="flex items-center space-x-2">
            <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-[#90C137]">
              <img 
                src="/nerdy_alligator_headshot.png" 
                alt="DATA_GATA Logo" 
                class="w-full h-full object-cover"
              />
            </div>
            <span class="text-xl font-bold text-[#F8F6F0]">
              DATA_<span class="text-[#90C137]">GATA</span>
            </span>
          </a>

          {/* Navigation - Desktop */}
          <div class="hidden md:flex items-center space-x-8">
            <a href="#about" class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors text-sm font-medium">
              About
            </a>
            <a href="#solutions" class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors text-sm font-medium">
              Solutions
            </a>
            <a href="#expertise" class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors text-sm font-medium">
              Expertise
            </a>
            <a href="#technologies" class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors text-sm font-medium">
              Technologies
            </a>
            <a 
              href="#contact" 
              class="bg-[#90C137] text-[#172217] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#90C137]/90 transition-colors"
            >
              Contact Us
            </a>
          </div>

          {/* Mobile Menu - Using an island for interactivity */}
          <MobileMenu />
        </div>
      </div>
    </nav>
  );
}