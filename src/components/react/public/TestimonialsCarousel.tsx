import { useRef } from 'react';
import type { Testimonial } from '../../../lib/types';

type Props = { testimonials: Pick<Testimonial, 'id' | 'author_name' | 'author_city' | 'rating' | 'content'>[] };

const STAR = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';

function Stars({ rating }: { rating: number }) {
  return (
    <div role="img" aria-label={`${rating} out of 5 stars`} className="flex gap-0.5 text-gold-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" width="18" height="18" fill={n <= rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
          <path d={STAR} />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsCarousel({ testimonials }: Props) {
  const scroller = useRef<HTMLUListElement>(null);
  const scrollBy = (dir: -1 | 1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  if (testimonials.length === 0) return null;

  const arrow = 'grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-ink-900 transition hover:border-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Customer testimonials">
      <ul
        ref={scroller}
        tabIndex={0}
        aria-label="Testimonials, scroll horizontally"
        className="-mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((t) => (
          <li key={t.id} className="flex shrink-0 basis-[88%] snap-start flex-col justify-between rounded-2xl bg-white p-7 ring-1 ring-slate-200 md:basis-[46%] lg:basis-[32%]">
            <div>
              <Stars rating={t.rating} />
              <blockquote className="mt-4 text-lg leading-relaxed text-slate-800">{t.content}</blockquote>
            </div>
            <p className="mt-6 font-semibold">
              {t.author_name}
              {t.author_city && <span className="font-normal text-slate-500">, {t.author_city}</span>}
            </p>
          </li>
        ))}
      </ul>
      {testimonials.length > 1 && (
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Previous testimonials" className={arrow}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => scrollBy(1)} aria-label="Next testimonials" className={arrow}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
