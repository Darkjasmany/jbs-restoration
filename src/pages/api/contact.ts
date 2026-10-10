import type { APIRoute } from 'astro';
import { getEnv } from '../../lib/env';
import { notifyLead, notifyN8n } from '../../lib/notify';
import { contactSchema } from '../../lib/schemas';
import { json, validationError } from '../../lib/utils';

const MIN_FILL_MS = 2500;

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { website, startedAt, ...lead } = parsed.data;
  const tooFast = typeof startedAt === 'number' && Date.now() - startedAt < MIN_FILL_MS;
  if (website || tooFast) return json({ ok: true });

  const { error } = await locals.supabase.from('leads').insert({ ...lead, source: 'contact_form' });
  if (error) return json({ error: 'We could not send your request. Please call us or try again.' }, 500);

  const env = getEnv(locals);
  const notice = Promise.all([notifyLead(env, lead), notifyN8n(env, lead)]);
  const waitUntil = locals.runtime?.ctx?.waitUntil?.bind(locals.runtime.ctx);
  if (waitUntil) waitUntil(notice);
  else await notice;

  return json({ ok: true });
};
