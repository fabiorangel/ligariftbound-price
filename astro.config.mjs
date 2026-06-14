import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://fabiorangel.github.io",
  base: "/ligariftbound-price",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
