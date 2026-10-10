import { useRef, useState, type SyntheticEvent, type ReactNode } from 'react';
import { MediaUploader, type UploadedMedia } from './MediaUploader';
import { removeObjects } from '../../../lib/storage';
import type { SiteConfigPayload } from '../../../lib/schemas';
import type { SiteConfig, WhatsAppMessage } from '../../../lib/types';

type Notice = { kind: 'ok' | 'error'; text: string };
type Asset = { url: string | null; path: string | null };

const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
const cardCls = 'space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200';
const MAX_MESSAGES = 6;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export function HeroSettings({ initial }: { initial: SiteConfig }) {
  const [heroType, setHeroType] = useState(initial.hero_type);
  const [video, setVideo] = useState<Asset>({ url: initial.hero_video_url, path: initial.hero_video_path });
  const [poster, setPoster] = useState<Asset>({ url: initial.hero_poster_url, path: initial.hero_poster_path });
  const [title, setTitle] = useState(initial.hero_title);
  const [subtitle, setSubtitle] = useState(initial.hero_subtitle ?? '');
  const [cta, setCta] = useState(initial.hero_cta_label);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp_number ?? '');
  const [messages, setMessages] = useState<WhatsAppMessage[]>(initial.whatsapp_messages);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const savedPaths = useRef(new Set([initial.hero_video_path, initial.hero_poster_path].filter((p): p is string => !!p)));

  const discard = (asset: Asset) => {
    if (asset.path && !savedPaths.current.has(asset.path)) void removeObjects('site', [asset.path]).catch(() => undefined);
  };

  const replace = (current: Asset, setter: (a: Asset) => void) => (items: UploadedMedia[]) => {
    const [item] = items;
    if (!item) return;
    discard(current);
    setter({ url: item.url, path: item.storage_path });
  };

  const clear = (current: Asset, setter: (a: Asset) => void) => {
    discard(current);
    setter({ url: null, path: null });
  };

  const setMessage = (i: number, changes: Partial<WhatsAppMessage>) => setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...changes } : m)));

  async function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);

    const payload: SiteConfigPayload = {
      hero_type: heroType,
      hero_video_url: video.url,
      hero_video_path: video.path,
      hero_poster_url: poster.url,
      hero_poster_path: poster.path,
      hero_title: title,
      hero_subtitle: subtitle,
      hero_cta_label: cta,
      phone,
      whatsapp_number: whatsapp.replace(/\D/g, ''),
      whatsapp_messages: messages,
    };

    try {
      const res = await fetch('/api/admin/site-config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.status === 401) {
        location.href = '/admin/login';
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: { message: string }[] };
      if (!res.ok) throw new Error(body.issues?.[0]?.message ?? body.error ?? 'Could not save the settings.');
      savedPaths.current = new Set([video.path, poster.path].filter((p): p is string => !!p));
      setNotice({ kind: 'ok', text: 'Saved. The website now shows your changes.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save the settings.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Home page banner</h2>
        <fieldset className="flex flex-wrap gap-6 text-sm font-medium">
          <legend className="mb-2 text-sm font-medium text-slate-800">Background</legend>
          {(['video', 'image'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input type="radio" name="hero_type" checked={heroType === t} onChange={() => setHeroType(t)} />
              {t === 'video' ? 'Video (desktop) with photo on phones' : 'Photo only'}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Background video</h3>
            {video.url && (
              <div className="space-y-2">
                <video key={video.url} src={video.url} controls muted playsInline className="aspect-video w-full rounded-lg bg-black" />
                <button type="button" onClick={() => clear(video, setVideo)} className="text-sm font-semibold text-red-700 hover:underline">Remove video</button>
              </div>
            )}
            <MediaUploader
              bucket="site"
              folder="hero"
              accept="video/mp4,video/webm"
              multiple={false}
              maxSizeMB={50}
              label={video.url ? 'Replace video' : 'Upload video'}
              hint="MP4, 1080p, no sound, under 15 MB loads fastest. Maximum 50 MB."
              onUploaded={replace(video, setVideo)}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Banner photo</h3>
            {poster.url && (
              <div className="space-y-2">
                <img src={poster.url} alt="" className="aspect-video w-full rounded-lg object-cover" />
                <button type="button" onClick={() => clear(poster, setPoster)} className="text-sm font-semibold text-red-700 hover:underline">Remove photo</button>
              </div>
            )}
            <MediaUploader
              bucket="site"
              folder="hero"
              accept="image/jpeg,image/png,image/webp"
              multiple={false}
              maxSizeMB={10}
              label={poster.url ? 'Replace photo' : 'Upload photo'}
              hint="Appears while the video loads and on phones. Use a wide photo of a finished roof."
              onUploaded={replace(poster, setPoster)}
            />
          </div>
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Banner text</h2>
        <Field label="Headline">
          <input required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Supporting text">
          <textarea rows={2} maxLength={300} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Button text">
          <input required minLength={2} maxLength={40} value={cta} onChange={(e) => setCta(e.target.value)} className={inputCls} />
        </Field>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Phone and WhatsApp</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number shown on the site">
            <input type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(555) 123-4567" />
          </Field>
          <Field label="WhatsApp number" hint="Digits only, with country code. Example: 15551234567. Leave empty to hide the chat button.">
            <input inputMode="numeric" maxLength={20} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} placeholder="15551234567" />
          </Field>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Quick replies in the chat button</h3>
          {messages.map((m, i) => (
            <div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[12rem_1fr_auto]">
              <input aria-label="Button label" maxLength={40} value={m.label} onChange={(e) => setMessage(i, { label: e.target.value })} className={inputCls + ' mt-0'} placeholder="Free estimate" />
              <input aria-label="Message sent to WhatsApp" maxLength={300} value={m.text} onChange={(e) => setMessage(i, { text: e.target.value })} className={inputCls + ' mt-0'} placeholder="Hi! I would like a free roof estimate." />
              <button type="button" onClick={() => setMessages((prev) => prev.filter((_, idx) => idx !== i))} className="rounded-md px-2 text-sm font-semibold text-red-700 hover:bg-white">Remove</button>
            </div>
          ))}
          {messages.length < MAX_MESSAGES && (
            <button type="button" onClick={() => setMessages((prev) => [...prev, { label: '', text: '' }])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
              Add quick reply
            </button>
          )}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {notice && (
          <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${notice.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
            {notice.text}
          </p>
        )}
      </div>
    </form>
  );
}
