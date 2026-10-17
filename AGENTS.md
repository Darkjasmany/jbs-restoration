# AGENTS.md

Corporate site + self-admin panel for JBS Restoration: Astro SSR on Cloudflare Workers, Supabase (Postgres/Auth/Storage) backend, React 19 islands. Docs, comments, and commit messages are in Spanish — keep them in Spanish.

## Commands

- Node ≥ 22.12. `astro` is not on the PATH; always use `npm run ...` or `npx astro ...`.
- Dev server, in background mode:

  ```
  npm run dev -- --background    # --force replaces an already-running server (the `--` is required)
  npx astro dev stop | status | logs
  ```

- `npm run check` (astro check) is the only verification step — there is **no linter, formatter, test suite, or CI** in this repo.
- **Never run `npm run build` while a dev server is active**: both share `.wrangler` state and the dev server hangs. Stop it first with `npx astro dev stop`.
- `npm run preview` → `wrangler dev` (real Worker locally). `npm run deploy` → cleans `.wrangler`/`dist`, builds, `wrangler deploy`.

## Stack and config facts

- Astro 7 SSR (`output: "server"`) + React islands + Tailwind 4 via `@tailwindcss/vite` + Zod, deployed to Cloudflare (config in `wrangler.json`, not `wrangler.toml`).
- **`README.md` is stale on versions** (says Astro 5, adapter 12, Tailwind 3, `wrangler.toml`, `wrangler pages dev`). Trust `package.json`, `astro.config.mjs`, and `wrangler.json` instead. `CAMBIOS.md` is the current change log for the recent performance/design refactor.
- Options in `astro.config.mjs` are deliberate — do not "fix" them:
  - `imageService: "passthrough"` — avoids provisioning Cloudflare's paid IMAGES binding.
  - `session: false` — admin auth uses its own Supabase cookies, not Astro Sessions (avoids an unused KV namespace).
  - `security: { checkOrigin: true }` — CSRF protection for the logout form and `/api/admin` mutations.
- Env vars: never read `import.meta.env`/`process.env` directly; call `getEnv(locals)` (`src/lib/env.ts`), which reads the `cloudflare:workers` env with a Vite fallback. Public vars go in `.env`, server secrets in `.dev.vars` (see the `.example` files).
- `npm run types` regenerates `src/lib/database.generated.ts` (needs `SUPABASE_PROJECT_ID` + Supabase CLI), but nothing imports that file — the hand-written `Database` type in `src/lib/types.ts` is what the code actually uses.
- DB schema changes go in ordered SQL migrations under `supabase/migrations/` (applied manually in the Supabase SQL editor or via `supabase db push`). The Storage buckets `projects` and `site` are created by the migrations.

## Architecture pointers

- `src/middleware.ts` guards `/admin/*` (except `/admin/login`) and `/api/admin/*`: validates the Supabase JWT server-side, refreshes expired sessions, and rotates cookies. Unauthenticated → `302` for pages, `401` for APIs.
- RLS + the `is_admin()` Postgres function is the real security barrier — admin queries run as the authenticated admin user, not the service role. `src/lib/supabase-admin.ts` (service role) throws if imported in the browser; keep it server-only.
- Admin React islands upload files directly to Supabase Storage; because the auth cookies are httpOnly, they fetch a short-lived JWT from `GET /api/admin/session`.
- Public pages are SSR and read `site_config` from Supabase on every request, so admin edits appear without a rebuild. The services catalog is code-defined in `src/lib/services.ts`, not in the DB.
- `POST /api/contact` always saves the lead to the `leads` table; the Resend email and the n8n webhook are optional, independent, and run via `waitUntil` without blocking the visitor's response.

Full Astro docs: https://docs.astro.build
