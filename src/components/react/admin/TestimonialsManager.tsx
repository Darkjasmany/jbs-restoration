import { useState, type SyntheticEvent } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ToastProvider, useToast } from '../ui/Toast';
import type { TestimonialPayload } from '../../../lib/schemas';
import type { Testimonial } from '../../../lib/types';

type ProjectOption = { id: string; title: string };
type Props = { initial: Testimonial[]; projects: ProjectOption[] };

type Draft = {
  id?: string;
  author_name: string;
  author_city: string;
  rating: number;
  content: string;
  project_id: string;
  is_published: boolean;
  sort_order: number;
};

const emptyDraft: Draft = { author_name: '', author_city: '', rating: 5, content: '', project_id: '', is_published: true, sort_order: 0 };
const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

const toDraft = (t: Testimonial): Draft => ({
  id: t.id,
  author_name: t.author_name,
  author_city: t.author_city ?? '',
  rating: t.rating,
  content: t.content,
  project_id: t.project_id ?? '',
  is_published: t.is_published,
  sort_order: t.sort_order,
});

const sortItems = (list: Testimonial[]) => [...list].sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));

async function send(payload: TestimonialPayload): Promise<Testimonial> {
  const res = await fetch('/api/admin/testimonials', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (res.status === 401) {
    location.href = '/admin/login';
    throw new Error('Session expired');
  }
  const body = (await res.json().catch(() => ({}))) as { testimonial?: Testimonial; error?: string; issues?: { message: string }[] };
  if (!res.ok || !body.testimonial) throw new Error(body.issues?.[0]?.message ?? body.error ?? 'Could not save the testimonial.');
  return body.testimonial;
}

function Manager({ initial, projects }: Props) {
  const notify = useToast();
  const [items, setItems] = useState(() => sortItems(initial));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const upsert = (t: Testimonial) => setItems((prev) => sortItems([...prev.filter((x) => x.id !== t.id), t]));

  async function onSave(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      upsert(await send({ ...draft, project_id: draft.project_id || null }));
      setDraft(null);
      notify('ok', 'Testimonial saved.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save the testimonial.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(t: Testimonial) {
    try {
      upsert(await send({ ...toDraft(t), project_id: t.project_id, is_published: !t.is_published }));
      notify('ok', t.is_published ? 'Hidden from the website.' : 'Now visible on the website.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not update the testimonial.');
    }
  }

  async function remove(t: Testimonial) {
    if (!confirm(`Delete the testimonial from ${t.author_name}?`)) return;
    const res = await fetch(`/api/admin/testimonials?id=${t.id}`, { method: 'DELETE' });
    if (!res.ok) return notify('error', 'Could not delete the testimonial.');
    setItems((prev) => prev.filter((x) => x.id !== t.id));
    notify('ok', 'Testimonial deleted.');
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setDraft({ ...emptyDraft })}>Add testimonial</Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">No testimonials yet. Add reviews from your real customers.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {t.author_name}
                    {t.author_city && <span className="font-normal text-slate-500"> · {t.author_city}</span>}
                  </p>
                  <p className="text-sm text-slate-500">{t.rating} of 5 stars</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${t.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {t.is_published ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-slate-700">{t.content}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setDraft(toDraft(t))}>Edit</Button>
                <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => void togglePublished(t)}>{t.is_published ? 'Hide' : 'Show'}</Button>
                <Button variant="danger" className="!px-3 !py-1.5" onClick={() => void remove(t)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? 'Edit testimonial' : 'Add testimonial'}>
        {draft && (
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Customer name
                <input required minLength={2} maxLength={80} value={draft.author_name} onChange={(e) => set('author_name', e.target.value)} className={inputCls} />
              </label>
              <label className="block text-sm font-medium">
                City
                <input maxLength={80} value={draft.author_city} onChange={(e) => set('author_city', e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="block text-sm font-medium">
              What they said
              <textarea required minLength={10} maxLength={1500} rows={5} value={draft.content} onChange={(e) => set('content', e.target.value)} className={inputCls} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Rating
                <select value={draft.rating} onChange={(e) => set('rating', Number(e.target.value))} className={inputCls}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Related project
                <select value={draft.project_id} onChange={(e) => set('project_id', e.target.value)} className={inputCls}>
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Display order
                <input type="number" min={0} max={9999} value={draft.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 0)} className={inputCls} />
                <span className="mt-1 block text-xs font-normal text-slate-500">Lower numbers appear first.</span>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-medium">
                <input type="checkbox" checked={draft.is_published} onChange={(e) => set('is_published', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Show on the website
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function TestimonialsManager(props: Props) {
  return (
    <ToastProvider>
      <Manager {...props} />
    </ToastProvider>
  );
}
