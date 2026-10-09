import type { APIRoute } from 'astro';
import { testimonialSchema } from '../../../lib/schemas';
import { json, validationError } from '../../../lib/utils';

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = testimonialSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { id, ...fields } = parsed.data;
  const db = locals.supabase;
  const query = id ? db.from('testimonials').update(fields).eq('id', id) : db.from('testimonials').insert(fields);
  const { data, error } = await query.select().single();
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, testimonial: data });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const id = url.searchParams.get('id') ?? '';
  if (!testimonialSchema.shape.id.safeParse(id).success) return json({ error: 'Invalid id' }, 400);
  const { error } = await locals.supabase.from('testimonials').delete().eq('id', id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
};
