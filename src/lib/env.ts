export type AppEnv = {
  url: string;
  anonKey: string;
  serviceKey: string;
  resendKey: string;
  notifyTo: string;
  notifyFrom: string;
};

export function getEnv(locals: App.Locals): AppEnv {
  const rt = (locals.runtime?.env ?? {}) as Partial<Env>;
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
  };
}
