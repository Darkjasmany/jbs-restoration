// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import cloudflare from "@astrojs/cloudflare";

// URL del dominio real antes de desplegar
const site = "https://jbsrestoration.com";

// https://astro.build/config
export default defineConfig({
  site,
  output: "server", // SSR en Cloudflare (CMS respaldado por Supabase)

  adapter: cloudflare({
    // Las imágenes viven en Supabase Storage y ya se suben optimizadas (WebP)
    // desde el admin (MediaUploader), así que NO necesitamos el servicio de
    // imágenes de Cloudflare. Con "passthrough" evitamos que el adaptador
    // provisione el binding "IMAGES" (que además requiere Cloudflare Images).
    // Si algún día usas <Image /> de Astro: usa "compile" (optimiza en build)
    // o "cloudflare-binding" (transforma on-demand).
    imageService: "passthrough",
  }),

  // La autenticación del admin usa cookies propias de Supabase, NO Astro
  // Sessions. Desactivarlo evita provisionar un KV namespace ("SESSION")
  // que nadie utiliza.
  session: false,

  // CSRF: rechaza POST/PUT/PATCH/DELETE cuyo Origin no coincida. Protege el
  // <form method="post"> de logout y las rutas /api/admin. Es el valor por
  // defecto (true), se deja explícito para que quede documentado.
  security: { checkOrigin: true },

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
