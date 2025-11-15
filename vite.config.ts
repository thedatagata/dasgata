import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    fresh({
      serverEntry: "./main.tsx",
      clientEntry: "./client.ts",
      islandsDir: "./islands",
      routeDir: "./routes",
    }),
    tailwindcss(),
  ],
});
