/// <reference path="../.astro/types.d.ts" />

interface Env {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY?: string;
  LEAD_NOTIFY_EMAIL?: string;
  LEAD_FROM_EMAIL?: string;
  N8N_WEBHOOK_URL?: string;
  N8N_WEBHOOK_SECRET?: string;
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly RESEND_API_KEY?: string;
  readonly LEAD_NOTIFY_EMAIL?: string;
  readonly LEAD_FROM_EMAIL?: string;
  readonly N8N_WEBHOOK_URL?: string;
  readonly N8N_WEBHOOK_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    supabase: import("@supabase/supabase-js").SupabaseClient<
      import("./lib/types").Database
    >;
    user: import("@supabase/supabase-js").User | null;
    accessToken: string | null;
  }
}
