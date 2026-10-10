import { useRef, useState, type SyntheticEvent, type ReactNode } from 'react';
import { MediaUploader, type UploadedMedia } from './MediaUploader';
import { removeObjects } from '../../../lib/storage';
import { SERVICE_OPTIONS } from '../../../lib/services';
import type { ProjectPayload } from '../../../lib/schemas';
import type { MediaRole, MediaType, ProjectWithMedia } from '../../../lib/types';

type Item = {
  key: string;
  persisted: boolean;
  type: MediaType;
  role: MediaRole;
  storage_path: string;
  url: string;
  alt_text: string;
  width: number | null;
  height: number | null;
};

type FormState = {
  title: string;
  description: string;
  service_type: string;
  city: string;
  state: string;
  roof_material: string;
  completed_on: string;
  is_featured: boolean;
  status: 'draft' | 'published';
  seo_title: string;
  seo_description: string;
};

type Notice = { kind: 'ok' | 'error'; text: string };

const MATERIALS = ['Asphalt shingle', 'Metal', 'Tile', 'Slate', 'Flat roof (TPO/EPDM)', 'Wood shake'];
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const GALLERY_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/webm`;

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

function Preview({ item, className }: { item: Item; className: string }) {
  return item.type === 'image' ? (
    <img src={item.url} alt={item.alt_text} className={className} loading="lazy" />
  ) : (
    <video src={item.url} muted playsInline preload="metadata" className={className} />
  );
}

export function ProjectForm({ initial }: { initial: ProjectWithMedia | null }) {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [saved, setSaved] = useState(Boolean(initial));
  const [form, setForm] = useState<FormState>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    service_type: initial?.service_type ?? 'roofing',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    roof_material: initial?.roof_material ?? '',
    completed_on: initial?.completed_on ?? '',
    is_featured: initial?.is_featured ?? false,
    status: initial?.status ?? 'draft',
    seo_title: initial?.seo_title ?? '',
    seo_description: initial?.seo_description ?? '',
  });
  const [media, setMedia] = useState<Item[]>(() =>
    (initial?.project_media ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({
        key: m.id,
        persisted: true,
        type: m.type,
        role: m.role,
        storage_path: m.storage_path,
        url: m.url,
        alt_text: m.alt_text ?? '',
        width: m.width,
        height: m.height,
      })),
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const mediaRef = useRef(media);
  mediaRef.current = media;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const discard = (item: Item) => {
    if (!item.persisted) void removeObjects('projects', [item.storage_path]).catch(() => undefined);
  };

  const addMedia = (role: MediaRole, single: boolean) => (uploaded: UploadedMedia[]) => {
    if (single) mediaRef.current.filter((m) => m.role === role).forEach(discard);
    setMedia((prev) => [
      ...(single ? prev.filter((m) => m.role !== role) : prev),
      ...uploaded.map<Item>((u) => ({ ...u, key: crypto.randomUUID(), persisted: false, role, alt_text: '' })),
    ]);
  };

  const removeItem = (item: Item) => {
    discard(item);
    setMedia((prev) => prev.filter((m) => m.key !== item.key));
  };

  const moveGallery = (key: string, dir: -1 | 1) =>
    setMedia((prev) => {
      const gallery = prev.filter((m) => m.role === 'gallery');
      const i = gallery.findIndex((m) => m.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= gallery.length) return prev;
      [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
      return [...prev.filter((m) => m.role !== 'gallery'), ...gallery];
    });

  const setAlt = (key: string, alt_text: string) => setMedia((prev) => prev.map((m) => (m.key === key ? { ...m, alt_text } : m)));

  async function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);

    const payload: ProjectPayload = {
      id,
      ...form,
      media: media.map(({ type, role, storage_path, url, alt_text, width, height }) => ({ type, role, storage_path, url, alt_text, width, height })),
    };

    try {
      const res = await fetch('/api/admin/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.status === 401) {
        location.href = '/admin/login';
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: { path: (string | number)[]; message: string }[] };
      if (!res.ok) {
        const issue = body.issues?.[0];
        const where = issue && typeof issue.path[0] === 'string' && issue.path[0] !== 'media' ? `${issue.path[0].replace('_', ' ')}: ` : '';
        throw new Error(issue ? `${where}${issue.message}` : (body.error ?? 'Could not save the project.'));
      }
      setMedia((prev) => prev.map((m) => ({ ...m, persisted: true })));
      if (!saved) history.replaceState(null, '', `/admin/projects/${id}`);
      setSaved(true);
      setNotice({ kind: 'ok', text: form.status === 'published' ? 'Saved and published.' : 'Saved as draft.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save the project.' });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm('Delete this project and all of its photos? This cannot be undone.')) return;
    setSaving(true);
    const res = await fetch(`/api/admin/projects?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      location.href = '/admin/projects';
      return;
    }
    setSaving(false);
    setNotice({ kind: 'error', text: 'Could not delete the project. Try again.' });
  }

  const single = (role: 'cover' | 'before' | 'after', title: string, hint: string) => {
    const current = media.find((m) => m.role === role);
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {current && (
          <div className="relative">
            <Preview item={current} className="aspect-[4/3] w-full rounded-lg object-cover" />
            <button type="button" onClick={() => removeItem(current)} className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-red-700 shadow hover:bg-white">
              Remove
            </button>
          </div>
        )}
        <MediaUploader
          bucket="projects"
          folder={id}
          accept={IMAGE_ACCEPT}
          multiple={false}
          maxSizeMB={10}
          label={current ? 'Replace photo' : 'Add photo'}
          hint={hint}
          onUploaded={addMedia(role, true)}
        />
      </div>
    );
  };

  const gallery = media.filter((m) => m.role === 'gallery');

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Project details</h2>
        <Field label="Title">
          <input required minLength={3} maxLength={140} value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Full roof replacement in Plano" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service">
            <select value={form.service_type} onChange={(e) => set('service_type', e.target.value)} className={inputCls}>
              {SERVICE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Roof material">
            <select value={form.roof_material} onChange={(e) => set('roof_material', e.target.value)} className={inputCls}>
              <option value="">Not specified</option>
              {MATERIALS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="City">
            <input maxLength={80} value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State">
              <input maxLength={2} value={form.state} onChange={(e) => set('state', e.target.value.toUpperCase())} className={inputCls} placeholder="TX" />
            </Field>
            <Field label="Completed on">
              <input type="date" value={form.completed_on} onChange={(e) => set('completed_on', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>
        <Field label="Description" hint="What was done, what problem it solved, and how the homeowner benefited.">
          <textarea rows={5} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} className={inputCls} />
        </Field>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Photos and video</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {single('cover', 'Cover photo', 'Shown on the portfolio grid. JPG, PNG, WebP or AVIF.')}
          {single('before', 'Before', 'Optional. Used in the before/after slider.')}
          {single('after', 'After', 'Optional. Used in the before/after slider.')}
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold text-slate-800">Gallery</h3>
          {gallery.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((item, i) => (
                <li key={item.key} className="space-y-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                  <Preview item={item} className="aspect-[4/3] w-full rounded-md object-cover" />
                  <input
                    value={item.alt_text}
                    maxLength={200}
                    onChange={(e) => setAlt(item.key, e.target.value)}
                    aria-label="Image description"
                    placeholder="Describe the photo (helps Google Images)"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex gap-1">
                      <button type="button" disabled={i === 0} onClick={() => moveGallery(item.key, -1)} className="rounded px-2 py-1 font-medium hover:bg-white disabled:opacity-30" aria-label="Move earlier">Earlier</button>
                      <button type="button" disabled={i === gallery.length - 1} onClick={() => moveGallery(item.key, 1)} className="rounded px-2 py-1 font-medium hover:bg-white disabled:opacity-30" aria-label="Move later">Later</button>
                    </span>
                    <button type="button" onClick={() => removeItem(item)} className="rounded px-2 py-1 font-semibold text-red-700 hover:bg-white">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <MediaUploader
            bucket="projects"
            folder={id}
            accept={GALLERY_ACCEPT}
            maxSizeMB={50}
            label="Add photos or videos"
            hint="Photos are resized and compressed automatically. Videos: MP4 or WebM, up to 50 MB."
            onUploaded={addMedia('gallery', false)}
          />
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold">Visibility</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select value={form.status} onChange={(e) => set('status', e.target.value as FormState['status'])} className={inputCls}>
              <option value="draft">Draft (only you can see it)</option>
              <option value="published">Published (visible on the website)</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-800">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Show on the home page
          </label>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">Search engine text (optional)</summary>
          <div className="mt-3 space-y-4">
            <Field label="Page title" hint="Up to 70 characters.">
              <input maxLength={70} value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Page description" hint="Up to 200 characters.">
              <textarea rows={2} maxLength={200} value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </details>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save project'}
        </button>
        <a href="/admin/projects" className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Back to projects</a>
        {saved && (
          <button type="button" onClick={onDelete} disabled={saving} className="ml-auto rounded-lg px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
            Delete project
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
