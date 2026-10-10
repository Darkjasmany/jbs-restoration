import { defineMiddleware } from 'astro:middleware';
import type { APIContext } from 'astro';
import type { User } from '@supabase/supabase-js';
import { getEnv, type AppEnv } from './lib/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  createServerSupabase,
  setAuthCookies,
  type Client,
} from './lib/supabase';
import { json } from './lib/utils';

type AdminSession = { client: Client; user: User; accessToken: string };

async function resolveAdminSession(ctx: APIContext, env: AppEnv): Promise<AdminSession | null> {
  const { cookies } = ctx;
  let access = cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = cookies.get(REFRESH_COOKIE)?.value ?? null;
  if (!access && !refresh) return null;

  const anon = createServerSupabase(env.url, env.anonKey);
  let user: User | null = null;

  if (access) {
    const { data, error } = await anon.auth.getUser(access);
    if (!error) user = data.user;
  }

  if (!user && refresh) {
    const { data, error } = await anon.auth.refreshSession({ refresh_token: refresh });
    if (error || !data.session) {
      clearAuthCookies(cookies);
      return null;
    }
    access = data.session.access_token;
    user = data.session.user;
    setAuthCookies(cookies, data.session);
  }

  if (!user || !access) {
    clearAuthCookies(cookies);
    return null;
  }

  const client = createServerSupabase(env.url, env.anonKey, access);
  const { data: admin } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) {
    clearAuthCookies(cookies);
    return null;
  }

  return { client, user, accessToken: access };
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  const env = getEnv(ctx.locals);

  ctx.locals.supabase = createServerSupabase(env.url, env.anonKey);
  ctx.locals.user = null;
  ctx.locals.accessToken = null;

  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  if (!isAdminApi && !isAdminPage) {
    const response = await next();
    const cacheable = ctx.request.method === 'GET' && response.status === 200 && response.headers.get('content-type')?.includes('text/html');
    if (cacheable && !response.headers.has('Cache-Control')) {
      response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    }
    return response;
  }

  const session = await resolveAdminSession(ctx, env);
  if (session) {
    ctx.locals.supabase = session.client;
    ctx.locals.user = session.user;
    ctx.locals.accessToken = session.accessToken;
  }

  const isLogin = pathname === '/admin/login' || pathname === '/admin/login/';
  if (isLogin) return session ? ctx.redirect('/admin') : next();

  if (!session) {
    return isAdminApi ? json({ error: 'Unauthorized' }, 401) : ctx.redirect('/admin/login');
  }

  const response = await next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
