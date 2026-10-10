import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { createServerSupabase, setAuthCookies } from '../../../lib/supabase';
import { json } from '../../../lib/utils';

type Failure = 'invalid' | 'forbidden';

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const wantsJson = request.headers.get('content-type')?.includes('application/json') ?? false;
  const fail = (code: Failure) => (wantsJson ? json({ error: code }, code === 'invalid' ? 401 : 403) : redirect(`/admin/login?error=${code}`, 303));

  let email = '';
  let password = '';
  if (wantsJson) {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
    email = String(body.email ?? '');
    password = String(body.password ?? '');
  } else {
    const form = await request.formData();
    email = String(form.get('email') ?? '');
    password = String(form.get('password') ?? '');
  }
  email = email.trim().toLowerCase();
  if (!email || !password) return fail('invalid');

  const env = getEnv(locals);
  const anon = createServerSupabase(env.url, env.anonKey);
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) return fail('invalid');

  const authed = createServerSupabase(env.url, env.anonKey, data.session.access_token);
  const { data: admin } = await authed.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!admin) return fail('forbidden');

  setAuthCookies(cookies, data.session);
  return wantsJson ? json({ ok: true }) : redirect('/admin', 303);
};
