import type { Client } from "./supabase";
import type {
  ProjectMedia,
  ProjectSummary,
  ProjectWithMedia,
  SiteConfig,
  Testimonial,
} from "./types";

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  id: 1,
  company_name: "JBS Restoration",
  tagline: null,
  hero_type: "video",
  hero_video_url: "/fallback-hero.mp4",
  hero_video_path: null,
  hero_poster_url: null,
  hero_poster_path: null,
  hero_title: "Roofing You Can Trust",
  hero_subtitle: null,
  hero_cta_label: "Get a Free Estimate",
  phone: null,
  email: null,
  whatsapp_number: null,
  whatsapp_messages: [],
  address: null,
  service_areas: [],
  social_links: {},
  updated_at: new Date(0).toISOString(),
};

export async function getSiteConfig(db: Client): Promise<SiteConfig> {
  if (!db) {
    console.warn("getSiteConfig: El cliente de Supabase (db) es undefined.");
    return DEFAULT_SITE_CONFIG;
  }

  const { data } = await db
    .from("site_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (!data) return DEFAULT_SITE_CONFIG;

  return data.hero_type === "video" && !data.hero_video_url
    ? { ...data, hero_video_url: DEFAULT_SITE_CONFIG.hero_video_url }
    : data;
}

const sortMedia = (p: ProjectWithMedia): ProjectWithMedia => ({
  ...p,
  project_media: [...p.project_media].sort(
    (a, b) => a.sort_order - b.sort_order,
  ),
});

export function coverOf(p: ProjectWithMedia): ProjectMedia | undefined {
  return (
    p.project_media.find((m) => m.role === "cover") ??
    p.project_media.find((m) => m.type === "image")
  );
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

type ProjectQuery = {
  limit?: number;
  featured?: boolean;
  service?: string;
  excludeId?: string;
};

export async function getPublishedProjects(
  db: Client,
  opts: ProjectQuery = {},
): Promise<ProjectWithMedia[]> {
  let query = db
    .from("projects")
    .select("*, project_media(*)")
    .eq("status", "published");
  if (opts.featured) query = query.eq("is_featured", true);
  if (opts.service) query = query.eq("service_type", opts.service);
  if (opts.excludeId) query = query.neq("id", opts.excludeId);
  const { data } = await query
    .order("sort_order", { ascending: true })
    .order("completed_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  return ((data ?? []) as unknown as ProjectWithMedia[]).map(sortMedia);
}

export async function getProjectBySlug(
  db: Client,
  slug: string,
): Promise<ProjectWithMedia | null> {
  const { data } = await db
    .from("projects")
    .select("*, project_media(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ? sortMedia(data as unknown as ProjectWithMedia) : null;
}

export async function getTestimonials(
  db: Client,
  limit = 12,
): Promise<Testimonial[]> {
  const { data } = await db
    .from("testimonials")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export const formatMonthYear = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(iso))
    : null;

export const placeOf = (p: { city: string | null; state: string | null }) =>
  [p.city, p.state].filter(Boolean).join(", ");
