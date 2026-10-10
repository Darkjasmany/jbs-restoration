import type { Client } from './supabase';
import type { ProjectMedia, ProjectSummary, ProjectWithMedia, SiteConfig, Testimonial } from './types';

/**
 * Usado únicamente si la fila (id=1) de site_config no existiera en la base de datos
 * (no debería pasar: 001_init.sql la crea). Refleja la identidad confirmada por el
 * cliente el 10 oct 2026 para que el sitio nunca muestre una marca genérica.
 */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  id: 1,
  company_name: 'JBS Restoration',
  tagline: null,
  hero_type: 'image',
  hero_video_url: null,
  hero_video_path: null,
  hero_poster_url: null,
  hero_poster_path: null,
  hero_title: 'The Difference Is in The Details',
  hero_subtitle: 'Professional Roofing, Siding and Restoration Services. Building Confidence Into Every Project.',
  hero_cta_label: 'Get a Free Estimate',
  phone: '+1 (917) 539-9904',
  email: 'info@jbsrestoration.com',
  whatsapp_number: '19175399904',
  whatsapp_messages: [
    { label: 'Free Estimate', text: "Hi! I'd like a free estimate, please." },
    { label: 'Schedule Inspection', text: "Hi! I'd like to schedule a roof inspection." },
    { label: 'Renovation Services', text: "Hi! I'm interested in your renovation services" },
  ],
  address: null,
  service_areas: ['Connecticut'],
  social_links: {
    facebook: 'https://www.facebook.com/share/14qih2KN1wE/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/jbsrestoration?vrfl=MTE2NHp3cW5ib2w2eA==',
  },
  updated_at: new Date(0).toISOString(),
};

/** Video de relleno (gradiente generado) que se usa solo si hero_type='video' pero aún no se subió ningún video. */
const FALLBACK_HERO_VIDEO = '/fallback-hero.mp4';

export async function getSiteConfig(db: Client): Promise<SiteConfig> {
  const { data } = await db.from('site_config').select('*').eq('id', 1).maybeSingle();
  if (!data) return DEFAULT_SITE_CONFIG;
  return data.hero_type === 'video' && !data.hero_video_url ? { ...data, hero_video_url: FALLBACK_HERO_VIDEO } : data;
}

const sortMedia = (p: ProjectWithMedia): ProjectWithMedia => ({
  ...p,
  project_media: [...p.project_media].sort((a, b) => a.sort_order - b.sort_order),
});

export function coverOf(p: ProjectWithMedia): ProjectMedia | undefined {
  return p.project_media.find((m) => m.role === 'cover') ?? p.project_media.find((m) => m.type === 'image');
}

export function toSummary(p: ProjectWithMedia): ProjectSummary {
  const cover = coverOf(p);
  return {
    slug: p.slug,
    title: p.title,
    service_type: p.service_type,
    city: p.city,
    state: p.state,
    roof_material: p.roof_material,
    completed_on: p.completed_on,
    cover_url: cover?.url ?? null,
    cover_alt: cover?.alt_text || p.title,
    cover_width: cover?.width ?? null,
    cover_height: cover?.height ?? null,
  };
}

type ProjectQuery = { limit?: number; featured?: boolean; service?: string; excludeId?: string };

export async function getPublishedProjects(db: Client, opts: ProjectQuery = {}): Promise<ProjectWithMedia[]> {
  let query = db.from('projects').select('*, project_media(*)').eq('status', 'published');
  if (opts.featured) query = query.eq('is_featured', true);
  if (opts.service) query = query.eq('service_type', opts.service);
  if (opts.excludeId) query = query.neq('id', opts.excludeId);
  const { data } = await query
    .order('sort_order', { ascending: true })
    .order('completed_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 100);
  return ((data ?? []) as unknown as ProjectWithMedia[]).map(sortMedia);
}

export async function getProjectBySlug(db: Client, slug: string): Promise<ProjectWithMedia | null> {
  const { data } = await db.from('projects').select('*, project_media(*)').eq('slug', slug).eq('status', 'published').maybeSingle();
  return data ? sortMedia(data as unknown as ProjectWithMedia) : null;
}

export async function getTestimonials(db: Client, limit = 12): Promise<Testimonial[]> {
  const { data } = await db
    .from('testimonials')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export const formatMonthYear = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso)) : null;

export const placeOf = (p: { city: string | null; state: string | null }) => [p.city, p.state].filter(Boolean).join(', ');
