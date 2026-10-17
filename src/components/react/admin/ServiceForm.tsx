import { useRef, useState, type SyntheticEvent, type ReactNode } from 'react';
import { MediaUploader, type UploadedMedia } from './MediaUploader';
import { removeObjects } from '../../../lib/storage';
import type { ServicePayload } from '../../../lib/schemas';
import type { Service, ServiceFaq } from '../../../lib/types';

type Notice = { kind: 'ok' | 'error'; text: string };

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const BUCKET = 'services';

const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
const cardCls = 'space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

/** Editor de una lista corta de textos (incluye / señales). */
function TextList({
  title,
  hint,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500">{hint}</p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            maxLength={300}
            onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
            className={inputCls + ' mt-0'}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="flex-none rounded-md px-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Add item
      </button>
    </div>
  );
}

export function ServiceForm({ initial }: { initial: Service | null }) {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [slug] = useState(initial?.slug ?? '');
  const [saved, setSaved] = useState(Boolean(initial));
  const [name, setName] = useState(initial?.name ?? '');
  const [shortDescription, setShortDescription] = useState(initial?.short_description ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [image, setImage] = useState<{ url: string | null; path: string | null }>({
    url: initial?.image_url ?? null,
    path: initial?.image_path ?? null,
  });
  const [imageAlt, setImageAlt] = useState(initial?.image_alt ?? '');
  const [includes, setIncludes] = useState<string[]>(initial?.includes ?? []);
  const [signs, setSigns] = useState<string[]>(initial?.signs ?? []);
  const [faqs, setFaqs] = useState<ServiceFaq[]>(initial?.faqs ?? []);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Rutas ya guardadas en la base de datos: no se borran al descartar una subida nueva.
  const savedPath = useRef<string | null>(initial?.image_path ?? null);

  const discardImage = (asset: { path: string | null }) => {
    if (asset.path && asset.path !== savedPath.current) void removeObjects(BUCKET, [asset.path]).catch(() => undefined);
  };

  const onUploaded = (items: UploadedMedia[]) => {
    const [item] = items;
    if (!item) return;
    discardImage(image);
    setImage({ url: item.url, path: item.storage_path });
  };

  const clearImage = () => {
    discardImage(image);
    setImage({ url: null, path: null });
  };

  async function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);

    const payload: ServicePayload = {
      id,
      name,
      short_description: shortDescription,
      description,
      image_url: image.url,
      image_path: image.path,
      image_alt: imageAlt,
      includes: includes.map((s) => s.trim()).filter(Boolean),
      signs: signs.map((s) => s.trim()).filter(Boolean),
      faqs: faqs
        .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
        .filter((f) => f.q && f.a),
      is_published: isPublished,
      is_featured: isFeatured,
      sort_order: Number(sortOrder) || 0,
    };

    try {
      const res = await fetch('/api/admin/services', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.status === 401) {
        location.href = '/admin/login';
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: { message: string }[] };
      if (!res.ok) throw new Error(body.issues?.[0]?.message ?? body.error ?? 'Could not save the service.');
      savedPath.current = image.path;
      if (!saved) history.replaceState(null, '', `/admin/services/${id}`);
      setSaved(true);
      setNotice({ kind: 'ok', text: isPublished ? 'Saved and published.' : 'Saved as draft.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save the service.' });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    setSaving(true);
    const res = await fetch(`/api/admin/services?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      location.href = '/admin/services';
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    setNotice({ kind: 'error', text: body.error ?? 'Could not delete the service. Try again.' });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Service details</h2>
        <Field label="Name">
          <input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Residential Roofing" />
        </Field>
        {slug && (
          <p className="text-xs text-slate-500">
            Web address: <span className="font-mono">/services/{slug}</span>
          </p>
        )}
        <Field label="Short description" hint="Shown on the cards and used as the page meta description. Up to 300 characters.">
          <textarea rows={2} maxLength={300} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Full description" hint="The main paragraph on the service page. Up to 5000 characters.">
          <textarea rows={6} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </Field>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Photo</h2>
        {image.url && (
          <div className="space-y-2">
            <img src={image.url} alt={imageAlt} className="aspect-[4/3] w-full max-w-md rounded-lg object-cover ring-1 ring-slate-200" />
            <button type="button" onClick={clearImage} className="text-sm font-semibold text-red-700 hover:underline">Remove photo</button>
          </div>
        )}
        <MediaUploader
          bucket={BUCKET}
          folder={id}
          accept={IMAGE_ACCEPT}
          multiple={false}
          maxSizeMB={10}
          label={image.url ? 'Replace photo' : 'Add photo'}
          hint="JPG, PNG, WebP or AVIF. Resized and compressed automatically."
          onUploaded={onUploaded}
        />
        <Field label="Photo description" hint="For accessibility and Google Images. Up to 200 characters.">
          <input maxLength={200} value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className={inputCls} placeholder="Residential roof installation" />
        </Field>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Extra content (optional)</h2>
        <TextList title="What is included" hint="One line per item. Leave empty to hide this section." items={includes} onChange={setIncludes} placeholder="Full tear-off and disposal" />
        <div className="border-t border-slate-200 pt-4">
          <TextList title="Signs you may need this" hint="One line per item. Leave empty to hide this section." items={signs} onChange={setSigns} placeholder="Missing or curling shingles" />
        </div>
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-800">Common questions</h3>
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <input
                aria-label="Question"
                maxLength={200}
                value={faq.q}
                onChange={(e) => setFaqs(faqs.map((f, idx) => (idx === i ? { ...f, q: e.target.value } : f)))}
                className={inputCls + ' mt-0'}
                placeholder="How long does a roof replacement take?"
              />
              <textarea
                aria-label="Answer"
                rows={2}
                maxLength={1000}
                value={faq.a}
                onChange={(e) => setFaqs(faqs.map((f, idx) => (idx === i ? { ...f, a: e.target.value } : f)))}
                className={inputCls + ' mt-0'}
                placeholder="Most homes are completed in one day."
              />
              <button type="button" onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))} className="text-sm font-semibold text-red-700 hover:underline">
                Remove question
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFaqs([...faqs, { q: '', a: '' }])}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Add question
          </button>
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Visibility and order</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select value={isPublished ? 'published' : 'draft'} onChange={(e) => setIsPublished(e.target.value === 'published')} className={inputCls}>
              <option value="draft">Draft (only you can see it)</option>
              <option value="published">Published (visible on the website)</option>
            </select>
          </Field>
          <Field label="Position" hint="Lower numbers appear first.">
            <input type="number" min={0} max={9999} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-800">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Show on the home page
          </label>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save service'}
        </button>
        <a href="/admin/services" className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Back to services</a>
        {saved && (
          <button type="button" onClick={onDelete} disabled={saving} className="ml-auto rounded-lg px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
            Delete service
          </button>
        )}
        {notice && (
          <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`w-full text-sm ${notice.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
            {notice.text}
          </p>
        )}
      </div>
    </form>
  );
}
