import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://fabiorangel.github.io",
  base: "/ligariftbound-price",
  integrations: [react()],
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
