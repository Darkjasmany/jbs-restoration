import type { ProjectWithMedia, SiteConfig } from './types';
import type { Service } from './services';
import { coverOf } from './queries';

export const abs = (path: string, site: string | URL) => new URL(path, site).toString();

export function localBusinessLd(config: SiteConfig, site: string | URL) {
  const sameAs = Object.values(config.social_links).filter((v) => /^https?:\/\//.test(v));
  return {
    '@context': 'https://schema.org',
    '@type': 'RoofingContractor',
    '@id': abs('/#business', site),
    name: config.company_name,
    url: abs('/', site),
    ...(config.phone && { telephone: config.phone }),
    ...(config.email && { email: config.email }),
    ...(config.address && { address: { '@type': 'PostalAddress', streetAddress: config.address } }),
    ...(config.hero_poster_url && { image: config.hero_poster_url }),
    ...(config.service_areas.length && { areaServed: config.service_areas.map((name) => ({ '@type': 'Place', name })) }),
    ...(sameAs.length && { sameAs }),
  };
}

export function serviceLd(service: Service, config: SiteConfig, site: string | URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.intro,
    url: abs(`/services/${service.slug}`, site),
    provider: { '@id': abs('/#business', site), '@type': 'RoofingContractor', name: config.company_name },
    ...(config.service_areas.length && { areaServed: config.service_areas }),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[], site: string | URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.path, site),
    })),
  };
}

export function projectLd(project: ProjectWithMedia, site: string | URL) {
  const images = project.project_media.filter((m) => m.type === 'image').map((m) => m.url);
  const cover = coverOf(project);
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: project.title,
    url: abs(`/portfolio/${project.slug}`, site),
    ...(project.description && { description: project.description }),
    ...(cover && { thumbnailUrl: cover.url }),
    ...(images.length && { image: images }),
    ...(project.completed_on && { dateCreated: project.completed_on }),
    ...(project.city && { contentLocation: { '@type': 'Place', name: [project.city, project.state].filter(Boolean).join(', ') } }),
  };
}
