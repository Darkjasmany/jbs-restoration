import type { APIRoute } from 'astro';
import type { Client } from '../../../lib/supabase';
import { projectSchema } from '../../../lib/schemas';
import { json, slugify, validationError } from '../../../lib/utils';

const BUCKET = 'projects';

async function uniqueSlug(db: Client, title: string): Promise<string> {
  const base = slugify(title) || 'project';
  const { data } = await db.from('projects').select('slug').like('slug', `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { media, ...fields } = parsed.data;
  const db = locals.supabase;

  const { data: existing, error: readError } = await db.from('projects').select('id, slug').eq('id', fields.id).maybeSingle();
  if (readError) return json({ error: readError.message }, 500);

  let slug = existing?.slug ?? '';
  if (existing) {
    const { id, ...changes } = fields;
    const { error } = await db.from('projects').update(changes).eq('id', id);
    if (error) return json({ error: error.message }, 500);
  } else {
    slug = await uniqueSlug(db, fields.title);
    const { error } = await db.from('projects').insert({ ...fields, slug });
    if (error) return json({ error: error.message }, 500);
  }

  const { data: previous } = await db.from('project_media').select('storage_path').eq('project_id', fields.id);

  const { error: mediaError } = await db.rpc('replace_project_media', { p_project_id: fields.id, p_media: media });
  if (mediaError) {
    if (!existing) await db.from('projects').delete().eq('id', fields.id);
    return json({ error: mediaError.message }, 500);
  }

  const keep = new Set(media.map((m) => m.storage_path));
  const orphaned = (previous ?? []).map((m) => m.storage_path).filter((p) => !keep.has(p));
  if (orphaned.length) await db.storage.from(BUCKET).remove(orphaned);

  return json({ ok: true, id: fields.id, slug });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const id = url.searchParams.get('id') ?? '';
  if (!projectSchema.innerType().shape.id.safeParse(id).success) return json({ error: 'Invalid id' }, 400);

  const db = locals.supabase;
  const { data: objects } = await db.storage.from(BUCKET).list(id, { limit: 1000 });

  const { error } = await db.from('projects').delete().eq('id', id);
  if (error) return json({ error: error.message }, 500);

  const paths = (objects ?? []).map((o) => `${id}/${o.name}`);
  if (paths.length) await db.storage.from(BUCKET).remove(paths);

  return json({ ok: true });
};
