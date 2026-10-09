// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import cloudfare from "@astrojs/cloudflare";

// URL del dominio real antes de desplegar
const site = "https://jbsrestoration.com";

// https://astro.build/config
export default defineConfig({
  site,
  output: "server", // Habilida la salida del servidor para SSR en este caso usare cloudflare pages

  // Configuración del adaptador de Cloudflare Pages
  adapter: cloudfare(),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react()],
});
