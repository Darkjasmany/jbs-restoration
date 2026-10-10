import type { AppEnv } from './env';

type LeadNotice = { name: string; email: string | null; phone: string | null; service: string | null; message: string | null };

/** Envía el aviso de nuevo lead por Resend. Sin configuración, no hace nada. Nunca lanza (el lead ya quedó guardado en Supabase). */
export async function notifyLead(env: AppEnv, lead: LeadNotice): Promise<void> {
  if (!env.resendKey || !env.notifyTo || !env.notifyFrom) return;
  const lines = [
    `Name: ${lead.name}`,
    `Phone: ${lead.phone ?? '-'}`,
    `Email: ${lead.email ?? '-'}`,
    `Service: ${lead.service ?? '-'}`,
    '',
    lead.message ?? '(no message)',
  ];
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.notifyFrom,
        to: [env.notifyTo],
        ...(lead.email && { reply_to: lead.email }),
        subject: `New estimate request from ${lead.name}`,
        text: lines.join('\n'),
      }),
    });
    if (!res.ok) console.error('Resend error', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('Resend request failed', err);
  }
}

/** Reenvía el lead a un workflow de n8n (Telegram, Slack, hojas de cálculo, lo que se arme ahí). Sin configuración, no hace nada. Nunca lanza. */
export async function notifyN8n(env: AppEnv, lead: LeadNotice): Promise<void> {
  if (!env.n8nUrl) return;
  try {
    const res = await fetch(env.n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(env.n8nSecret && { 'x-webhook-secret': env.n8nSecret }) },
      body: JSON.stringify({ ...lead, source: 'jbsrestoration.com', created_at: new Date().toISOString() }),
    });
    if (!res.ok) console.error('n8n webhook error', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('n8n webhook request failed', err);
  }
}
