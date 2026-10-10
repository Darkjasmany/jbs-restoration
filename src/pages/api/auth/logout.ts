import type { APIRoute } from 'astro';
import { clearAuthCookies } from '../../../lib/supabase';

export const POST: APIRoute = ({ cookies, redirect }) => {
  clearAuthCookies(cookies);
  return redirect('/admin/login', 303);
};
