// islands/MobileMenu.tsx
import { useState } from "preact/hooks";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div class="md:hidden">
      {/* Mobile Menu Button */}
      <button
        class="text-[#F8F6F0] focus:outline-none px-3 py-2 rounded-md"
        onClick={toggleMenu}
        aria-label="Toggle mobile menu"
      >
        {isOpen ? <i class="fas fa-times text-xl"></i> : <i class="fas fa-bars text-xl"></i>}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div class="absolute left-0 right-0 mt-2 mx-4 bg-[#172217]/95 backdrop-blur-sm py-4 px-2 rounded-lg shadow-lg border border-[#F8F6F0]/10 z-50">
          <div class="flex flex-col space-y-4">
            <a
              href="#about"
              class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors px-3 py-2 text-sm font-medium"
              onClick={() => setIsOpen(false)}
            >
              About
            </a>
            <a
              href="#solutions"
              class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors px-3 py-2 text-sm font-medium"
              onClick={() => setIsOpen(false)}
            >
              Solutions
            </a>
            <a
              href="#expertise"
              class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors px-3 py-2 text-sm font-medium"
              onClick={() => setIsOpen(false)}
            >
              Expertise
            </a>
            <a
              href="#technologies"
              class="text-[#F8F6F0]/90 hover:text-[#90C137] transition-colors px-3 py-2 text-sm font-medium"
              onClick={() => setIsOpen(false)}
            >
              Technologies
            </a>
            <a
              href="#contact"
              class="bg-[#90C137] text-[#172217] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#90C137]/90 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Contact Us
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
