// Client side of the optional Hume "Expressive Delivery" layer. The Hume call itself happens
// server-side only (/api/hume-delivery in server.ts) — this module just posts a recording's audio
// and merges the already-categorized results. Every failure path resolves to "nothing", never
// throws: Hume is an enhancement and must never block the rest of the report.
import type { ExpressiveCategoryResult } from '../types/onboarding';

export async function fetchExpressiveDelivery(blob: Blob | null, durationSeconds: number): Promise<ExpressiveCategoryResult[]> {
  if (!blob || blob.size === 0) return [];
  try {
    const res = await fetch(`/api/hume-delivery?durationSec=${encodeURIComponent(durationSeconds)}`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.categories) ? data.categories : [];
  } catch {
    return [];
  }
}

// Combines per-recording results (Read Aloud attempts + Free Speech) into one list, unioning
// whichever words fired for each category across all of them and counting how many recordings
// each one fired in, so the most-recurring words surface first. Returns undefined when empty so
// the saved report omits the field entirely and the section doesn't render.
export function mergeExpressiveDelivery(perRecording: ExpressiveCategoryResult[][]): ExpressiveCategoryResult[] | undefined {
  const byKey = new Map<ExpressiveCategoryResult['key'], { label: string; counts: Map<string, number> }>();
  for (const categories of perRecording) {
    for (const c of categories) {
      const entry = byKey.get(c.key) ?? { label: c.label, counts: new Map<string, number>() };
      c.words.forEach(w => entry.counts.set(w, (entry.counts.get(w) ?? 0) + 1));
      byKey.set(c.key, entry);
    }
  }
  const merged = [...byKey.entries()].map(([key, { label, counts }]) => ({
    key,
    label,
    words: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w),
  }));
  return merged.length > 0 ? merged : undefined;
}
