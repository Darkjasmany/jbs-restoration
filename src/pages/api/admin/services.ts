import type { APIRoute } from 'astro';
import type { Client } from '../../../lib/supabase';
import { serviceSchema } from '../../../lib/schemas';
import { json, slugify, validationError } from '../../../lib/utils';

const BUCKET = 'services';

async function uniqueSlug(db: Client, name: string): Promise<string> {
  const base = slugify(name) || 'service';
  const { data } = await db.from('services').select('slug').like('slug', `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = serviceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const fields = parsed.data;
  const db = locals.supabase;

  const { data: existing, error: readError } = await db
    .from('services')
    .select('id, slug, image_path')
    .eq('id', fields.id)
    .maybeSingle();
  if (readError) return json({ error: readError.message }, 500);

  let slug = existing?.slug ?? '';
  if (existing) {
    const { id, ...changes } = fields;
    const { error } = await db.from('services').update(changes).eq('id', id);
    if (error) return json({ error: error.message }, 500);
  } else {
    slug = await uniqueSlug(db, fields.name);
    const { error } = await db.from('services').insert({ ...fields, slug });
    if (error) return json({ error: error.message }, 500);
  }

  // La imagen es única por servicio (services/<id>/<uuid>.<ext>): borra la anterior si se reemplazó o quitó.
  const previous = existing?.image_path ?? null;
  if (previous && previous !== fields.image_path) {
    await db.storage.from(BUCKET).remove([previous]);
  }

  return json({ ok: true, id: fields.id, slug });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const id = url.searchParams.get('id') ?? '';
  if (!serviceSchema.innerType().shape.id.safeParse(id).success) return json({ error: 'Invalid id' }, 400);

  const db = locals.supabase;
  const { data: service } = await db.from('services').select('slug').eq('id', id).maybeSingle();
  if (!service) return json({ error: 'Not found' }, 404);

  // No dejar proyectos huérfanos: si algún proyecto usa este servicio, no se elimina.
  const { count } = await db
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('service_type', service.slug);
  if (count && count > 0) {
    return json(
      {
        error: `This service is used by ${count} project${count === 1 ? '' : 's'}. Unpublish it instead, or change those projects first.`,
      },
      409,
    );
  }

  const { data: objects } = await db.storage.from(BUCKET).list(id, { limit: 1000 });

  const { error } = await db.from('services').delete().eq('id', id);
  if (error) return json({ error: error.message }, 500);

  const paths = (objects ?? []).map((o) => `${id}/${o.name}`);
  if (paths.length) await db.storage.from(BUCKET).remove(paths);

  return json({ ok: true });
};
