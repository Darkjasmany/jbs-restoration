import type { APIRoute } from 'astro';
import { reorderMediaSchema } from '../../../lib/schemas';
import { json, validationError } from '../../../lib/utils';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reordena la media de un proyecto sin reenviar el formulario completo. Body: { project_id, ids: [media ids en el nuevo orden] } */
export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = reorderMediaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { project_id, ids } = parsed.data;
  const db = locals.supabase;
  const results = await Promise.all(
    ids.map((id, index) => db.from('project_media').update({ sort_order: index }).eq('id', id).eq('project_id', project_id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return json({ error: failed.error.message }, 500);
  return json({ ok: true });
};

/** Elimina una foto o video: fila en la base de datos y archivo en Storage. */
export const DELETE: APIRoute = async ({ url, locals }) => {
  const id = url.searchParams.get('id') ?? '';
  if (!UUID.test(id)) return json({ error: 'Invalid id' }, 400);

  const db = locals.supabase;
  const { data: media } = await db.from('project_media').select('storage_path').eq('id', id).maybeSingle();
  if (!media) return json({ error: 'Not found' }, 404);

  const { error } = await db.from('project_media').delete().eq('id', id);
  if (error) return json({ error: error.message }, 500);

  await db.storage.from('projects').remove([media.storage_path]);
  return json({ ok: true });
};
