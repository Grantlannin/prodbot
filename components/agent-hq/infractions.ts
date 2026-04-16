import type { Infraction } from './types';

export const INFRACTIONS_STORAGE_KEY = 'agentHQ_infractions';

/** Matches e.g. `infraction - phone`, `infraction: scrolling Twitter` */
export function parseInfractionCommand(raw: string): { categoryKey: string; label: string } | null {
  const m = raw.trim().match(/^\s*infraction\s*[-–—:]\s*(.+)$/i);
  if (!m) return null;
  const label = m[1].trim();
  if (!label) return null;
  return { categoryKey: label.toLowerCase(), label };
}

export function startOfLocalDayMs(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** First-seen category order; counts aggregate repeats. */
export function infractionCategoriesInOrder(rows: Infraction[]): { key: string; label: string; count: number }[] {
  const sorted = [...rows].sort((a, b) => a.createdAt - b.createdAt);
  const order: string[] = [];
  const map = new Map<string, { label: string; count: number }>();
  for (const r of sorted) {
    if (!map.has(r.categoryKey)) order.push(r.categoryKey);
    const cur = map.get(r.categoryKey) ?? { label: r.label, count: 0 };
    cur.count += 1;
    cur.label = r.label;
    map.set(r.categoryKey, cur);
  }
  return order.map(k => {
    const v = map.get(k)!;
    return { key: k, label: v.label, count: v.count };
  });
}

/** Highest count; ties break by first appearance in `infractionCategoriesInOrder`. */
export function topInfractionLine(rows: Infraction[]): string | null {
  const ordered = infractionCategoriesInOrder(rows);
  if (ordered.length === 0) return null;
  const max = Math.max(...ordered.map(c => c.count));
  const top = ordered.find(c => c.count === max)!;
  return `Top infraction: ${top.label} (${top.count})`;
}
