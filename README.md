# JBS Restoration — sitio corporativo + panel autoadministrable

Astro 5 (SSR) + React 19 + Tailwind CSS 3 + Supabase (Postgres, Auth, Storage), desplegado en Cloudflare Pages.

> **Versiones fijadas a propósito.** `@astrojs/cloudflare@12` es la línea del adaptador que despliega en **Cloudflare Pages** (`pages_build_output_dir`) y expone `locals.runtime.env`. Las líneas más nuevas del adaptador (Astro 6 / adaptador 13) cambian el modelo de despliegue y de variables de entorno; no actualices sin leer su guía de migración. `@astrojs/tailwind` requiere Tailwind 3; si migras a Tailwind 4, se reemplaza por `@tailwindcss/vite`.

## Estructura

```
astro.config.mjs · wrangler.toml · tailwind.config.mjs · tsconfig.json · package.json
public/                 favicon.svg · robots.txt · fallback-hero.mp4 (respaldo del hero)
supabase/migrations/    001_init.sql (tablas, RLS, buckets) · 002_rpc_and_storage.sql (RPC atómica de media, video en projects) · 003_seed_business_profile.sql (datos reales del negocio)
src/
  env.d.ts · middleware.ts
  lib/            types · schemas (zod) · services (catálogo de servicios) · queries · seo (JSON-LD)
                  supabase · supabase-admin · storage · env · notify · utils
  layouts/        BaseLayout · PublicLayout · AdminLayout
  styles/         global.css
  pages/
    index · about · contact · 404 · sitemap.xml
    services/     index · [slug]
    portfolio/    index · [slug]
    admin/        login · index (resumen) · settings · testimonials
                  projects/ index · new · [id]
    api/          contact
                  auth/ login · logout
                  admin/ session · projects · project-media · testimonials · site-config
  components/
    astro/        Header · Footer · Hero · ServicesGrid · ProjectCard · CtaBand · SEO
    react/ui/     Button · Modal · Toast
    react/public/ WhatsAppButton · ContactForm · PortfolioFilter · BeforeAfterSlider · TestimonialsCarousel
    react/admin/  LoginForm · MediaUploader · ProjectForm · TestimonialsManager · HeroSettings
```

**Qué es dinámico y qué no.** Hero, contacto, WhatsApp, áreas de servicio (`site_config`), proyectos y testimonios vienen de Supabase y el cliente los edita desde `/admin`. El catálogo de servicios (textos, preguntas frecuentes) está en `src/lib/services.ts` y se cambia en código. Ese texto y el de `/about` son genéricos y deben revisarse con el cliente antes de publicar.

## 1. Entorno local

**Requisitos:** Node ≥ 20.3 (recomendado 22), una cuenta de Supabase.

1. **Dependencias:** `npm install`
2. **Proyecto Supabase.** Crea un proyecto y copia *Project URL*, *anon key* y *service_role key* (Settings → API).
3. **Migraciones.** En *SQL Editor* ejecuta, en orden, `001_init.sql`, `002_rpc_and_storage.sql` y `003_seed_business_profile.sql` (esta última precarga el teléfono, WhatsApp, redes sociales y textos del banner ya confirmados por el cliente). Con la CLI: `supabase link --project-ref <ref> && supabase db push`.
4. **Storage.** Los buckets `projects` y `site` (públicos) los crean las migraciones. El límite por archivo del plan Free es **50 MB** aunque el bucket permita más (Settings → Storage).
5. **Auth.** En *Authentication → Sign In / Providers → Email* desactiva **Allow new users to sign up**. Crea al cliente en *Authentication → Users → Add user* (con *Auto Confirm User*) y conviértelo en administrador:
   ```sql
   insert into admin_users (user_id, full_name)
   select id, 'Nombre del cliente' from auth.users where email = 'cliente@correo.com';
   ```
6. **Variables.**
   ```bash
   cp .env.example .env              # PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY
   cp .dev.vars.example .dev.vars    # secretos de servidor (service role, Resend)
   ```
7. **Arrancar:** `npm run dev` → sitio en `http://localhost:4321`, panel en `/admin`.

Comandos: `npm run check` (tipos), `npm run build`, `npm run preview` (Worker real con `wrangler pages dev`), `npm run types` (regenera tipos desde tu DB; requiere `SUPABASE_PROJECT_ID` y la CLI).

## 2. Autenticación, seguridad y RLS

**Flujo de sesión**

1. `POST /api/auth/login` valida credenciales con Supabase Auth, comprueba que el usuario esté en `admin_users` y guarda `sb-access-token` y `sb-refresh-token` en cookies `httpOnly`, `secure`, `sameSite=lax`.
2. `middleware.ts` intercepta `/admin/*` (excepto `/admin/login`) y `/api/admin/*`. Valida el JWT con `auth.getUser()` (verificación en el servidor de Supabase, no solo decodificación), renueva con el refresh token si expiró y actualiza las cookies. Sin sesión válida: `302 → /admin/login` en páginas y `401` JSON en la API.
3. Con sesión válida, `locals.supabase` ejecuta las consultas **como el usuario administrador**, de modo que RLS sigue siendo la barrera real. Las rutas `/admin` responden con `Cache-Control: private, no-store` y `X-Robots-Tag: noindex`.
4. Las islas de React suben archivos **directo a Supabase Storage**. Como la cookie es `httpOnly`, el navegador obtiene un JWT de corta duración desde `GET /api/admin/session` (`getAccessToken()` en `lib/supabase.ts`), cacheado hasta 60 s antes de expirar.

**Quién puede qué (RLS)**

| Recurso | Anónimo | Administrador (`is_admin()`) |
|---|---|---|
| `projects`, `project_media` | solo `status = 'published'` | todo |
| `testimonials` | solo `is_published` | todo |
| `site_config` | lectura | actualización |
| `leads` | solo insertar | todo |
| Storage `projects` / `site` | lectura pública | subir, reemplazar, borrar |

`is_admin()` consulta `admin_users`: tener cuenta en Supabase no basta para administrar.

**Reglas a mantener**

- `SUPABASE_SERVICE_ROLE_KEY` es secreto de servidor. `lib/supabase-admin.ts` lanza error si se importa en el navegador. El código actual no lo necesita; queda listo para endpoints como `/api/contact`.
- `security.checkOrigin` está activo: bloquea POST de otros orígenes (CSRF).
- Cada request admin cuesta 2 consultas a Supabase (validar usuario + comprobar `admin_users`). Es aceptable para un panel con un usuario; no lo apliques a rutas públicas.
- Recomendado a futuro: Cloudflare Turnstile en el login y en el formulario de contacto.

**Ciclo de vida de archivos.** Se nombran `projects/<project_id>/<uuid>.<ext>` y `site/hero/<uuid>.<ext>`. Al guardar, el servidor elimina de Storage los archivos que ya no están referenciados. Si el administrador reemplaza o quita una subida que aún no guardó, el componente la borra en el acto. Solo quedan huérfanos si cierra la pestaña a mitad de edición; una limpieza periódica de objetos sin fila en `project_media` lo resuelve.

## 3. Despliegue en Cloudflare Pages (conservando el correo de Google Workspace)

### 3.1 Proyecto en Pages

1. Sube el repo a GitHub/GitLab. En Cloudflare: *Workers & Pages → Create → Pages → Connect to Git*.
2. Build: framework preset **Astro**, comando `npm run build`, salida `dist`, variable `NODE_VERSION` = `22`.
3. *Settings → Variables and Secrets* (Production y Preview): `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` como **texto** (se incrustan en el build del cliente); `SUPABASE_SERVICE_ROLE_KEY` y, si activas avisos de leads, `RESEND_API_KEY` como **secretos**; `LEAD_NOTIFY_EMAIL` y `LEAD_FROM_EMAIL` como texto.
4. `wrangler.toml` declara `pages_build_output_dir` y el flag `nodejs_compat`; con ese archivo, Cloudflare lo toma como fuente de configuración.
5. Despliega y prueba primero en `https://<proyecto>.pages.dev` (login, subida de una foto, cambio de hero).
6. En Supabase, *Authentication → URL Configuration*: *Site URL* = `https://jbsrestoration.com`.

### 3.2 Dominio sin romper el correo

Para usar `jbsrestoration.com` (dominio raíz) en Pages, la zona DNS debe estar en Cloudflare. Mover DNS es donde se rompe el correo si falta un registro, así que el orden importa:

1. **Inventario antes de tocar nada.** Exporta la zona actual desde el registrador o consulta:
   ```bash
   dig +short MX  jbsrestoration.com
   dig +short TXT jbsrestoration.com
   dig +short TXT google._domainkey.jbsrestoration.com
   dig +short TXT _dmarc.jbsrestoration.com
   ```
   Google Workspace usa uno de estos dos esquemas de MX; copia el que tengas **exactamente**:

   | Prioridad | Servidor (esquema clásico) |
   |---|---|
   | 1 | `aspmx.l.google.com` |
   | 5 | `alt1.aspmx.l.google.com` |
   | 5 | `alt2.aspmx.l.google.com` |
   | 10 | `alt3.aspmx.l.google.com` |
   | 10 | `alt4.aspmx.l.google.com` |

   Esquema nuevo: un único MX, prioridad 1, `smtp.google.com`. Conserva también el SPF (`v=spf1 include:_spf.google.com ~all` o el que tengas), la clave DKIM (`google._domainkey`), `_dmarc` y el TXT `google-site-verification`.
2. **DNSSEC.** Si está activo en el registrador, desactívalo *antes* de cambiar nameservers; si no, el dominio (y su correo) deja de resolver. Reactívalo después con el DS de Cloudflare.
3. **Añade el sitio a Cloudflare** (plan Free). El escaneo importa registros, pero **compáralo línea por línea** con el inventario y agrega lo que falte. MX y TXT quedan en *DNS only*.
4. **No actives Cloudflare Email Routing.** Reemplaza los MX por los suyos y cortaría Google Workspace.
5. **Cambia los nameservers** en el registrador por los dos que Cloudflare indica, en horario de baja actividad.
6. **Conecta el dominio a Pages:** proyecto → *Custom domains* → `jbsrestoration.com` y `www.jbsrestoration.com`. Antes elimina solo los `A`/`AAAA`/`CNAME` del hosting anterior para `@` y `www`; **no toques MX ni TXT**.
7. **Verificación.** Repite los `dig` del paso 1 y compara. Envía y recibe un correo de prueba desde una cuenta externa. En Google Admin: *Domains → Manage domains* debe mostrar el MX como verificado.
8. Redirige `www` → raíz (o al revés) con una *Redirect Rule*.

## 4. Problemas frecuentes

| Síntoma | Causa / solución |
|---|---|
| `MessageChannel is not defined` en producción | React 19 en Workers. Resuelto con el alias `react-dom/server.edge` en `astro.config.mjs`; no lo quites. |
| Subida falla con 413 | El archivo supera el límite del bucket o del plan (50 MB en Free). Comprime el video. |
| Subida falla con 403 | El usuario no está en `admin_users` o falta la migración de políticas de Storage. |
| Login correcto pero vuelve a `/login` | Falta la fila en `admin_users`, o el navegador no guarda cookies `secure` (Safari sobre `http://localhost` con build de producción). Usa `npm run dev`. |
| El hero no muestra video en móvil | Intencional: con pantalla < 768 px, ahorro de datos o movimiento reducido se muestra la foto del banner. |
| Cambios del hero tardan en verse | Las páginas son SSR y leen `site_config` en cada petición. Si añadiste caché en Cloudflare, purga o reduce el TTL. |

## 5. Avisos de nuevas solicitudes (correo y n8n)

`POST /api/contact` (`src/pages/api/contact.ts`) hace, en este orden:

1. Valida el formulario con zod (`contactSchema`), incluyendo un campo honeypot oculto y un tiempo mínimo de llenado (protección antibot básica).
2. Guarda el lead en la tabla `leads` de Supabase. **Esto siempre ocurre**, aunque no configures nada más.
3. Dispara en paralelo, sin bloquear la respuesta al visitante (`waitUntil` en Cloudflare):
   - `notifyLead()` → correo por **Resend**, si configuraste `RESEND_API_KEY`, `LEAD_NOTIFY_EMAIL` y `LEAD_FROM_EMAIL`.
   - `notifyN8n()` → `POST` al webhook de **n8n**, si configuraste `N8N_WEBHOOK_URL`.

Ambos avisos son opcionales e independientes entre sí, y ninguno puede hacer fallar la respuesta al visitante: si Resend o n8n no responden, el lead ya quedó guardado en Supabase y el error solo se registra en el log del Worker (`wrangler pages deployment tail`).

### Correo con Resend

Servicio usado: [Resend](https://resend.com) (tiene plan gratuito). Pasos:

1. Crea la cuenta y verifica el dominio de envío (`Domains → Add Domain`). Te pedirá agregar registros **SPF y DKIM** en el DNS. **Solo se agregan; los MX de Google Workspace no se tocan.** Si el dominio ya tiene un SPF, combínalo en un único registro TXT (no se admiten dos SPF).
2. Genera una API key (`API Keys → Create`).
3. En Cloudflare Pages, agrega como **secretos**: `RESEND_API_KEY`, y como texto: `LEAD_NOTIFY_EMAIL` (a quién llega el aviso) y `LEAD_FROM_EMAIL` (remitente verificado, formato `Nombre <correo@jbsrestoration.com>`).

Si prefieres no usar Resend, deja esas variables vacías: el sitio funciona igual y los leads quedan en la tabla `leads`.

### Automatización con n8n

n8n recibe una copia del lead por webhook y decide qué hacer con ella (Telegram, Slack, una hoja de cálculo, lo que arme el flujo). No reemplaza el guardado en Supabase, es un canal adicional.

1. En n8n, agrega un nodo **Webhook**: método `POST`, y copia la **Production URL** (no la de `/webhook-test/`, que solo funciona mientras el editor está abierto).
2. Define un secreto largo y ponlo también en n8n para compararlo.
3. Agrega un nodo **IF** que continúe solo si el header `x-webhook-secret` coincide con tu secreto (así nadie puede llamar tu webhook desde fuera).
4. Desde ahí, cualquier nodo: **Telegram → Send a text message** (crea el bot con [@BotFather](https://t.me/BotFather) usando `/newbot`, y obtén tu chat ID escribiéndole al bot y consultando `https://api.telegram.org/bot<TOKEN>/getUpdates`), **Send Email**, **Google Sheets**, etc.
5. En Cloudflare Pages, agrega como texto `N8N_WEBHOOK_URL` (la Production URL) y como secreto `N8N_WEBHOOK_SECRET`.

El cuerpo que recibe n8n es JSON:

```json
{
  "name": "Jane Doe",
  "email": null,
  "phone": "5551234567",
  "service": "roof-repair",
  "message": "Leak near chimney",
  "source": "jbsrestoration.com",
  "created_at": "2026-09-29T03:55:20.744Z"
}
```

n8n debe estar en una URL pública con HTTPS (n8n Cloud, o un servidor propio con dominio y certificado); desde Cloudflare Pages no se puede llamar a una IP local.

Antes de publicar, añade Cloudflare Turnstile al formulario si empiezas a recibir spam: el honeypot frena bots simples, no bots dirigidos.

## 6. SEO incluido

Metadatos y canonical por página, Open Graph, JSON-LD `RoofingContractor` (en todas las páginas), `Service`, `BreadcrumbList` e `ImageGallery` (proyectos), `sitemap.xml` dinámico con los proyectos publicados y `robots.txt` que bloquea `/admin` y `/api`. No se generan reseñas ni `aggregateRating` en el marcado: Google no muestra estrellas para reseñas que el propio negocio publica sobre sí mismo. Las páginas públicas envían `Cache-Control: s-maxage=60`, que solo tiene efecto si añades una *Cache Rule* en Cloudflare para HTML.
