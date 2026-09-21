// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

// Cambia esta URL por tu dominio real antes de desplegar
const site = "https://jbsrestorationroofing.com";

// https://astro.build/config
export default defineConfig({
  site,
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react()],
});
