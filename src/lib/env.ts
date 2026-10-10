import { env } from "cloudflare:workers";

export type AppEnv = {
  url: string;
  anonKey: string;
  serviceKey: string;
  resendKey: string;
  notifyTo: string;
  notifyFrom: string;
  n8nUrl: string;
  n8nSecret: string;
};

export function getEnv(locals: App.Locals): AppEnv {
  // const rt = (locals.runtime?.env ?? {}) as Partial<Env>;

  // Leemos del módulo de Cloudflare Workers; si no existe (ej. en build local de Vite), usamos un objeto vacío
  const rt = (typeof env !== "undefined" ? env : {}) as Record<
    string,
    string | undefined
  >;

  return {
    url: rt.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL,
    anonKey:
      rt.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    serviceKey:
      rt.SUPABASE_SERVICE_ROLE_KEY ??
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY ??
      "",
    resendKey: rt.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? "",
    notifyTo: rt.LEAD_NOTIFY_EMAIL ?? import.meta.env.LEAD_NOTIFY_EMAIL ?? "",
    notifyFrom: rt.LEAD_FROM_EMAIL ?? import.meta.env.LEAD_FROM_EMAIL ?? "",
    n8nUrl: rt.N8N_WEBHOOK_URL ?? import.meta.env.N8N_WEBHOOK_URL ?? "",
    n8nSecret:
      rt.N8N_WEBHOOK_SECRET ?? import.meta.env.N8N_WEBHOOK_SECRET ?? "",
  };
}
