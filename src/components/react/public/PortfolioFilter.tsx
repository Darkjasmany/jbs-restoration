import { useMemo, useState } from 'react';
import type { ProjectSummary } from '../../../lib/types';

type Props = {
  projects: ProjectSummary[];
  services: [string, string][];
  initialService?: string;
  initialCity?: string;
};

const nameOf = (services: [string, string][], slug: string) => services.find(([s]) => s === slug)?.[1] ?? slug;

export function PortfolioFilter({ projects, services, initialService = '', initialCity = '' }: Props) {
  const [service, setService] = useState(initialService);
  const [city, setCity] = useState(initialCity);

  const availableServices = useMemo(() => services.filter(([slug]) => projects.some((p) => p.service_type === slug)), [services, projects]);
  const cities = useMemo(() => [...new Set(projects.map((p) => p.city).filter((c): c is string => !!c))].sort(), [projects]);
  const visible = useMemo(() => projects.filter((p) => (!service || p.service_type === service) && (!city || p.city === city)), [projects, service, city]);

  const update = (nextService: string, nextCity: string) => {
    setService(nextService);
    setCity(nextCity);
    const params = new URLSearchParams();
    if (nextService) params.set('service', nextService);
    if (nextCity) params.set('city', nextCity);
    history.replaceState(null, '', params.size ? `?${params}` : location.pathname);
  };

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${active ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by service">
        <button type="button" aria-pressed={!service} onClick={() => update('', city)} className={chip(!service)}>All projects</button>
        {availableServices.map(([slug, name]) => (
          <button key={slug} type="button" aria-pressed={service === slug} onClick={() => update(slug, city)} className={chip(service === slug)}>
            {name}
          </button>
        ))}
        {cities.length > 1 && (
          <label className="ml-auto text-sm font-medium text-slate-700">
            <span className="sr-only">Filter by city</span>
            <select value={city} onChange={(e) => update(service, e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-600" aria-live="polite">
        {visible.length} {visible.length === 1 ? 'project' : 'projects'}
      </p>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-8 text-slate-600">No projects match these filters yet.</p>
      ) : (
        <ul className="mt-4 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <li key={p.slug}>
              <a href={`/portfolio/${p.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-200">
                  {p.cover_url && (
                    <img
                      src={p.cover_url}
                      alt={p.cover_alt}
                      width={p.cover_width ?? 800}
                      height={p.cover_height ?? 600}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <h3 className="mt-3 text-lg font-bold group-hover:text-brand-600">{p.title}</h3>
                <p className="text-sm text-slate-600">
                  {[nameOf(services, p.service_type), [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
