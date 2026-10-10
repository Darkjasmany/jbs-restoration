import type { APIRoute } from 'astro';
import { SERVICES } from '../lib/services';

type Entry = { path: string; lastmod?: string };

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ locals, site }) => {
  const base = (site ?? new URL('https://jbsrestoration.com')).origin;
  const { data: projects } = await locals.supabase.from('projects').select('slug, updated_at').eq('status', 'published');

  const entries: Entry[] = [
    { path: '/' },
    { path: '/services' },
    ...SERVICES.map((s) => ({ path: `/services/${s.slug}` })),
    { path: '/portfolio' },
    ...(projects ?? []).map((p) => ({ path: `/portfolio/${p.slug}`, lastmod: p.updated_at.slice(0, 10) })),
    { path: '/about' },
    { path: '/contact' },
  ];

  const body = entries
    .map((e) => `  <url><loc>${escapeXml(base + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`)
    .join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600' },
  });
};
