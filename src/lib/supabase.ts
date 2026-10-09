import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import type { Database } from "./types";

export type Client = SupabaseClient<Database>;

/** Manejo de Cookies Seguras */
export const ACCESS_COOKIE = "sb-access-token";
export const REFRESH_COOKIE = "sb-refresh-token";

const cookieBase = {
  path: "/",
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
};

/** Guardar y Eliminar Sesión */
export function setAuthCookies(
  cookies: AstroCookies,
  session: { access_token: string; refresh_token: string },
) {
  cookies.set(ACCESS_COOKIE, session.access_token, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 7,
  });
  cookies.set(REFRESH_COOKIE, session.refresh_token, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(cookies: AstroCookies) {
  cookies.delete(ACCESS_COOKIE, { path: "/" });
  cookies.delete(REFRESH_COOKIE, { path: "/" });
}

/** Cliente SSR sin estado. Con accessToken, las consultas se ejecutan como ese usuario (RLS aplica). */
export function createServerSupabase(
  url: string,
  anonKey: string,
  accessToken?: string | null,
): Client {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

function jwtExp(token: string): number {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).exp ?? 0;
  } catch {
    return 0;
  }
}

let cachedToken: { value: string; exp: number } | null = null;

/** Solo navegador: obtiene el JWT de la sesión (cookie httpOnly) vía /api/admin/session y lo cachea hasta 60 s antes de expirar. */
export async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.exp - 60 > Date.now() / 1000)
    return cachedToken.value;
  const res = await fetch("/api/admin/session", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    cachedToken = null;
    return null;
  }
  const { access_token } = (await res.json()) as { access_token: string };
  cachedToken = { value: access_token, exp: jwtExp(access_token) };
  return access_token;
}

let browserClient: Client | null = null;

/** Solo navegador (islas del /admin): cliente que usa la sesión del administrador para Storage y PostgREST. */
export function getBrowserSupabase(): Client {
  browserClient ??= createClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      accessToken: getAccessToken,
    },
  );
  return browserClient;
}
