import type { APIRoute } from 'astro';
import { siteConfigSchema } from '../../../lib/schemas';
import { json, validationError } from '../../../lib/utils';

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = siteConfigSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const input = parsed.data;
  const db = locals.supabase;

  const { data: current } = await db.from('site_config').select('hero_video_path, hero_poster_path').eq('id', 1).maybeSingle();

  const { error } = await db.from('site_config').update(input).eq('id', 1);
  if (error) return json({ error: error.message }, 500);

  const stale = [current?.hero_video_path, current?.hero_poster_path].filter(
    (p): p is string => !!p && p !== input.hero_video_path && p !== input.hero_poster_path,
  );
  if (stale.length) await db.storage.from('site').remove(stale);

  return json({ ok: true });
};
