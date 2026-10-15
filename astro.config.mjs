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

  // Precarga en el cliente los enlaces del viewport para que la navegación
  // entre páginas se sienta instantánea (no descarga nada que no se use).
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "viewport",
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Mantiene el JS de cada isla en chunks pequeños y cacheables.
      cssCodeSplit: true,
    },
  },

  integrations: [react()],
});
