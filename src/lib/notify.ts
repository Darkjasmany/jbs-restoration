import type { AppEnv } from './env';

type LeadNotice = { name: string; email: string | null; phone: string | null; service: string | null; message: string | null };

/** Envía el aviso de nuevo lead por Resend. Sin configuración, no hace nada. Nunca lanza. */
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
    await fetch('https://api.resend.com/emails', {
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
  } catch {
    /* el lead ya está guardado en la base de datos */
  }
}
