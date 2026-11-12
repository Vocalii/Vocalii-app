import type { ExpressiveCategoryResult } from '../types/onboarding';

// Fixed display order + identity color per category — descriptive, not scored, so color marks
// which category this is, never an intensity/band.
const CATEGORIES: { key: ExpressiveCategoryResult['key']; label: string; color: string }[] = [
  { key: 'clarity', label: 'Clarity', color: '#21e8ff' },
  { key: 'speechFlow', label: 'Speech Flow', color: '#a78bfa' },
  { key: 'expression', label: 'Expression', color: '#fb923c' },
  { key: 'voiceQuality', label: 'Voice Quality', color: '#fbbf24' },
];

type Weight = 'sm' | 'md' | 'lg';

// Weight is driven by how much Hume actually gave us for this category — more detected words and
// an AI description to go with them reads as "more happened here", not a score or ranking.
function weightFor(words: string[], description?: string): Weight {
  const signal = words.length + (description ? 2 : 0);
  if (signal >= 5) return 'lg';
  if (signal >= 3) return 'md';
  return 'sm';
}

const SIZES: Record<Weight, { pad: string; maxW: string; header: string; words: string; desc: string }> = {
  sm: { pad: 'px-[14px] py-[11px]', maxW: 'max-w-[170px]', header: 'text-[16px]', words: 'text-[11px]', desc: 'text-[11.5px]' },
  md: { pad: 'px-[16px] py-[14px]', maxW: 'max-w-[230px]', header: 'text-[20px]', words: 'text-[12.5px]', desc: 'text-[12.5px]' },
  lg: { pad: 'px-[20px] py-[18px]', maxW: 'max-w-[320px]', header: 'text-[26px]', words: 'text-[13px]', desc: 'text-[13.5px]' },
};

// A single content-sized chip in the wrap — nearly borderless, since the color identity now lives
// in the shared ambient field behind the whole cluster rather than a per-card glow/border.
function CategoryChip({ category, words, description }: { category: typeof CATEGORIES[number]; words: string[]; description?: string }) {
  const weight = weightFor(words, description);
  const size = SIZES[weight];
  return (
    <div
      className={`relative flex flex-col gap-1.5 rounded-[16px] border border-white/[0.08] bg-[rgba(10,12,15,0.3)] ${size.pad} ${size.maxW}`}
    >
      <div
        className={`font-light tracking-tight ${size.header}`}
        style={weight === 'lg' ? { color: category.color, textShadow: `0 0 16px ${category.color}80` } : { color: category.color }}
      >
        {category.label}
      </div>
      <div className={size.words} style={{ color: category.color, opacity: 0.6 }}>
        {words.slice(0, 5).map((w, i) => (
          <span key={w}>
            {i > 0 && <span className="text-zinc-600 mx-1 font-light">·</span>}
            {w}
          </span>
        ))}
      </div>
      {description && (
        <p className={`${size.desc} leading-relaxed text-zinc-300 font-light`}>{description}</p>
      )}
    </div>
  );
}

// Optional report section — renders nothing unless Hume returned usable results (see
// /api/hume-delivery in server.ts). A category is omitted entirely when nothing was detected for
// it this session, rather than shown empty or defaulted to some baseline.
export default function ExpressiveDeliverySection({ categories }: { categories?: ExpressiveCategoryResult[] }) {
  if (!categories || categories.length === 0) return null;

  type Entry = { cat: typeof CATEGORIES[number]; words: string[]; description?: string };
  const present: Entry[] = [];
  for (const cat of CATEGORIES) {
    const match = categories.find(c => c.key === cat.key);
    if (match && match.words.length > 0) {
      present.push({ cat, words: match.words, description: match.description });
    }
  }

  if (present.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 text-center">Expressive Delivery</span>
      <div className="relative py-[18px] px-1">
        <div className="absolute pointer-events-none inset-0">
          {present.map(({ cat }, i) => (
            <div
              key={cat.key}
              className="absolute rounded-full aspect-square"
              style={{
                // % of the container, not fixed px — a wide desktop column needs the same
                // blobs spread across its whole width, not just a mobile-sized patch of it.
                width: ['38%', '42%', '46%', '36%'][i % 4],
                top: ['-25%', '5%', '45%', '65%'][i % 4],
                left: ['-6%', '36%', '-4%', '40%'][i % 4],
                filter: 'blur(50px)',
                background: `radial-gradient(circle, ${cat.color} 0%, transparent 72%)`,
                opacity: 0.2,
              }}
            />
          ))}
        </div>
        <div className="relative flex flex-wrap justify-center gap-3 items-start">
          {present.map(({ cat, words, description }) => (
            <CategoryChip key={cat.key} category={cat} words={words} description={description} />
          ))}
        </div>
      </div>
    </div>
  );
}
