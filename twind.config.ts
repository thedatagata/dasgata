// twind.config.ts
import { Options } from "$fresh/plugins/twind.ts";

export default {
  selfURL: import.meta.url,
  theme: {
    extend: {
      colors: {
        // Add your custom color palette
        "[#172217]": "#172217", // Dark green
        "[#90C137]": "#90C137", // Light green
        "[#F8F6F0]": "#F8F6F0", // Off-white
        "[#7dab2a]": "#7dab2a", // Darker green for hover states
      },
      backgroundColor: {
        "[#172217]": "#172217",
        "[#90C137]": "#90C137",
        "[#F8F6F0]": "#F8F6F0",
        "[#7dab2a]": "#7dab2a",
        "[#172217]/95": "rgba(23, 34, 23, 0.95)",
        "[#90C137]/20": "rgba(144, 193, 55, 0.2)",
        "[#90C137]/10": "rgba(144, 193, 55, 0.1)",
        "[#F8F6F0]/10": "rgba(248, 246, 240, 0.1)",
        "[#F8F6F0]/5": "rgba(248, 246, 240, 0.05)",
      },
      textColor: {
        "[#172217]": "#172217",
        "[#90C137]": "#90C137",
        "[#F8F6F0]": "#F8F6F0",
        "[#F8F6F0]/90": "rgba(248, 246, 240, 0.9)",
        "[#F8F6F0]/80": "rgba(248, 246, 240, 0.8)",
        "[#F8F6F0]/70": "rgba(248, 246, 240, 0.7)",
      },
      borderColor: {
        "[#172217]": "#172217",
        "[#90C137]": "#90C137",
        "[#F8F6F0]/20": "rgba(248, 246, 240, 0.2)",
        "[#F8F6F0]/10": "rgba(248, 246, 240, 0.1)",
        "[#90C137]/30": "rgba(144, 193, 55, 0.3)",
      },
    },
  },
} as Options;