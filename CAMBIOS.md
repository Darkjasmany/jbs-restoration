# Cambios y decisiones — JBS Restoration

> Registro de la auditoría de rendimiento y los ajustes aplicados.
> Rama: `rama-diseno`. Última actualización: 15 oct 2026.
>
> La mayoría de estos cambios están en el commit **`3e87b5e`**
> ("feat: Sigo con la modificacion del Hero y Header").
> Sin commitear actualmente: el recorte final de `public/favicon.png` y este archivo.

---

## 1. Configuración de Astro (`astro.config.mjs`)

Se mantiene `output: "server"` (SSR en Cloudflare) porque el sitio es un CMS
respaldado por Supabase y los cambios del admin deben verse sin recompilar.

| Opción | Antes | Ahora | Motivo |
|---|---|---|---|
| `adapter` | `cloudflare()` | `cloudflare({ imageService: "passthrough" })` | No usamos `<Image />` de Astro (las imágenes ya se suben optimizadas a Supabase). Evita provisionar el binding `IMAGES` (Cloudflare Images, de pago). |
| `session` | (por defecto, con KV) | `false` | La autenticación usa cookies propias de Supabase, **no** Astro Sessions. Evita provisionar un namespace KV `SESSION` que nadie usa. |
| `security` | (por defecto `true`) | `{ checkOrigin: true }` explícito | Protección CSRF para el `<form>` de logout y `/api/admin`. Se deja explícito para documentar la intención. |
| `prefetch` | — | `{ prefetchAll: false, defaultStrategy: "viewport" }` | Navegación entre páginas casi instantánea sin descargar de más. |
| `vite.build.cssCodeSplit` | — | `true` | Mantiene el CSS/JS de cada isla en chunks pequeños y cacheables. |

**Notas sobre configuraciones descartadas:**

- `platformProxy: { enabled: true }` → **ya no existe** en `@astrojs/cloudflare` v14
  (fue reemplazado por el Cloudflare Vite plugin). Solo añadía lentitud.
- `session: { driver: "memory" }` → la firma `driver: "..."` está **deprecada** en
  Astro 6/7; además `memory` en Workers es por-isolate (inservible).
- Alias `react-dom/server` → `react-dom/server.edge` → **innecesario**:
  `react-dom@19` ya resuelve `"workerd": "./server.edge.js"` automáticamente.

---

## 2. Fuentes: Roboto desde Google Fonts

- `src/layouts/BaseLayout.astro`:
  - `<link rel="preconnect">` a `fonts.googleapis.com` y `fonts.gstatic.com` (`crossorigin`).
  - `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap">`.
- `src/styles/global.css`: `--font-sans` usa `"Roboto"` y elimina las declaraciones `@font-face`.

**Por qué `wght@100..900`:** Roboto ya es una fuente **variable** en Google Fonts
(`font-weight: 100 900`). Un solo archivo cubre de 400 a 900 e incluye los pesos
600 (`font-semibold`) y 800 (`font-extrabold`) que usa el diseño, sin sintetizarlos.

**Resultado:** no se aloja ningún `.woff2` en el proyecto. (Esto reemplaza la
solución anterior de autoalojar Outfit con `@fontsource-variable/outfit`, que se
desinstaló.)

---

## 3. Ícono / Logo

### Fuente maestra: `public/logo-source.png`

- Es el **original en alta resolución (4500×4500)** que dejó el cliente. Se usa
  como fuente para regenerar el logo cuando haga falta.
- El contenido dorado ocupa `1321,1232 → 3178,3267` (≈ 1862×2040 px); el resto
  es **margen transparente** (1321 px por lado). Ese margen era la causa de que
  el ícono se viera pequeño pese a tener un contenedor de 56px.

> ⚠️ `logo-source.png` pesa ~133 KB y, al estar en `public/`, **se despliega**
> aunque nadie lo use. Si se quiere evitar, mover a una carpeta no pública
> (p. ej. `design/`) o excluirlo del deploy.

### `src/components/astro/Header.astro`

```html
<a href="/" class="flex items-center gap-2 group">
  <img src="/favicon.png" alt="" width="51" height="56"
       class="h-14 w-auto shrink-0" />
  ...
</a>
```

- **Sin contenedor cuadrado**: antes era `h-12 w-12` con `p-2` (ícono a ~32px) y
  luego `h-14 w-14` con `object-contain` (dejaba aire a los lados). Ahora el
  `<img>` usa `h-14 w-auto`: mide 56px de alto y el ancho sale de su proporción
  (51px), sin espacios.
- `gap-2` (8px) en el `<a>`: el ícono queda **muy pegado a las letras**.
- `alt=""` porque el nombre de la marca ya está en el texto de al lado.
- `shrink-0` para que no se aplaste.

### `public/favicon.png`

- Generado desde `logo-source.png` con un recorte en **dos etapas**:
  1. se detecta el contenido real en el original (alpha > 8) y se descarta el
     margen transparente (1321 px por lado);
  2. se escala a 256 px de alto y **se vuelve a recortar** al contenido, para
     eliminar el halo que deja el reescalado en los bordes delgados.
- Resultado: **234×256, ~22 KB**, proporción 0.914, con **márgenes = 0** en los
  cuatro lados (verificado por script).
- Se usa para el ícono del Header y para el favicon de la pestaña.
- `logo-source-removebg-preview.png` es una copia de **500×500** (menor calidad):
  no se usa como fuente; el maestro es `logo-source.png`.

**Para ajustar el tamaño** (solo el `<img>` y el `<a>` del logo, en Header.astro):

| Quieres | Cambia |
|---|---|
| Más grande | `h-14` → `h-16` (64px); `height="64"` |
| Igual al texto | `h-14` → `h-12` (48px); `height="48"` |
| Más/menos pegado al texto | `gap-2` → `gap-1.5` (6px) o `gap-3` (12px) |

---

## 4. Velocidad en desarrollo (HMR)

- `src/lib/queries.ts`: **cache solo-dev** (`devMemo`) para `getSiteConfig`,
  `getPublishedProjects`, `getProjectBySlug` y `getTestimonials`.
  En dev, cambiar un carácter recarga toda la página y vuelve a consultar
  Supabase (remoto, ~50–200 ms por query); el cache evita repetir consultas
  entre recargas seguidas.
  En producción se elimina por completo (tree-shaking) → cero overhead.

**Causas externas de lentitud (revisar en tu equipo):**

- **Console Ninja** (extensión de VS Code): se conecta a Vite y lo ralentiza.
  Desactivada; si sigue apareciendo `Console Ninja extension is connected to Vite`,
  recarga la ventana de VS Code (`Developer: Reload Window`).
- **Windows Defender**: agregar exclusiones para la carpeta del proyecto y
  `node_modules`.
- **Doble copia del proyecto**: había otro `astro dev` corriendo desde
  `C:\Users\Jasmany\Downloads\jbsrestoration`. Si no se usa, cerrarlo.

**Importante:** no ejecutar `npm run build` con el dev server activo.
Comparten el estado de `.wrangler` y el dev server se cuelga. Detener primero con
`npx astro dev stop`.

---

## 5. Limpieza de archivos

- Eliminado `src/styles/global copy.css` (copia muerta, no se importaba).
- (Sesiones previas, ya en commit) eliminadas copias `Header copy*.astro`,
  `Hero copy*.astro`, `ContactForm copy.tsx`, `src/data/dataNav.ts` y los
  archivos de fuente falsos en `public/fonts/`.
- **Pendiente:** `src/components/astro/Hero.astro.backup` sigue en el repo
  (código muerto, no se importa). Se puede eliminar con
  `git rm src/components/astro/Hero.astro.backup`.

---

## 6. Comandos útiles

`astro` NO es un comando global (no está en el PATH). Usar:

```powershell
npm run dev                 # arrancar dev
npm run dev -- --force      # reemplazar un dev server existente (el -- es necesario)
npx astro dev stop          # detener el dev server de fondo
npx astro dev status        # ver si hay uno corriendo
npx astro dev logs          # ver logs
npm run build               # build de producción (sin dev activo)
npm run deploy              # build + wrangler deploy
```

---

## 7. Pendientes sugeridos (opcionales)

1. **Imágenes responsive:** añadir `srcset` usando el endpoint de Supabase
   (`/storage/v1/render/image/public/...?width=800&quality=75`) donde se usen `<img>`.
2. **`TestimonialsCarousel`:** convertir a Astro para dejar la home 100% sin React.
3. **Favicon dedicado:** opcionalmente, un `favicon.ico`/PNG de 32×32 específico
   para la pestaña del navegador.

---

## 8. Ajustes de UI (header y hero)

### "RESTORATION" en el header
- `Header.astro`: el subtítulo pasó de `text-[10px]` a `text-[11px]` (un poco
  más grande).

### Separación del titular del hero respecto al header
- En la home el header se usa con `overlay`, así que **flota sobre el hero**
  (`absolute inset-x-0 top-0 z-40`).
- Altura del header overlay: **~96px** en móvil y **~129px desde 768px**, porque
  la barra de utilidad (`hidden md:block`) añade ~33px.
- El hero tenía `pt-28` (112px) por debajo de `lg`: menor que los ~129px del
  header a partir de 768px → el titular quedaba **pegado/por debajo del header**
  (se notaba sobre todo a ~800px de ancho).
- Ahora: `pt-32 pb-20 md:pt-44 lg:pb-28` → ~32px de aire en móvil y ~47px desde
  768px.
