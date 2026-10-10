import { useState } from 'react';

type Img = { url: string; alt: string };
type Props = { before: Img; after: Img };

export function BeforeAfterSlider({ before, after }: Props) {
  const [pos, setPos] = useState(50);

  return (
    <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-xl bg-slate-200 focus-within:ring-4 focus-within:ring-brand-500/40 sm:aspect-[16/10]">
      <img src={after.url} alt={after.alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <img
        src={before.url}
        alt={before.alt}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <span className="pointer-events-none absolute left-3 top-3 rounded bg-ink-900/80 px-2 py-1 text-xs font-semibold text-white">Before</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded bg-ink-900/80 px-2 py-1 text-xs font-semibold text-white">After</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink-900 shadow-lg">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
