import type { APIRoute } from "astro";
import { getEnv } from "../../lib/env";
import { contactSchema } from "../../lib/schemas";
import { json, validationError } from "../../lib/utils";
import { notifyLead } from "../../lib/notify";

const MIN_FILL_MS = 2500;

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = contactSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { website, startedAt, ...lead } = parsed.data;
  const tooFast =
    typeof startedAt === "number" && Date.now() - startedAt < MIN_FILL_MS;
  if (website || tooFast) return json({ ok: true });

  const { error } = await locals.supabase
    .from("leads")
    .insert({ ...lead, source: "contact_form" });
  if (error)
    return json(
      { error: "We could not send your request. Please call us or try again." },
      500,
    );

  const notice = notifyLead(getEnv(locals), lead);
  // Acceso seguro al contexto de Cloudflare Workers para ejecuciones en segundo plano
  const runtime = (locals as Record<string, any>).runtime;
  // const waitUntil = locals.runtime?.ctx?.waitUntil?.bind(locals.runtime.ctx);
  const waitUntil = runtime?.ctx?.waitUntil?.bind(runtime.ctx);
  if (waitUntil) waitUntil(notice);
  else await notice;

  return json({ ok: true });
};
