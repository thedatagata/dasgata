// islands/ScrollToTop.tsx
import { IS_BROWSER } from "fresh/runtime";

export default function ScrollToTop() {
  // Don't render on server
  if (!IS_BROWSER) {
    return <div style="display:none"></div>;
  }

  const scrollToTop = () => {
    globalThis.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      id="scrollToTop"
      class="fixed bottom-6 right-6 p-3 bg-[#90C137] text-white rounded-full shadow-lg transition-opacity duration-300 hover:bg-[#7dab2a] focus:outline-none opacity-0 pointer-events-none"
      aria-label="Scroll to top"
    >
      <i class="fas fa-arrow-up"></i>
    </button>
  );
}
