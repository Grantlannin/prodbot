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

export function infractionStats(rows: Infraction[]): {
  total: number;
  byCategory: { key: string; label: string; count: number }[];
  top: { key: string; label: string; count: number } | null;
} {
  const map = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const cur = map.get(r.categoryKey) ?? { label: r.label, count: 0 };
    cur.count += 1;
    cur.label = r.label;
    map.set(r.categoryKey, cur);
  }
  const byCategory = [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count);
  return {
    total: rows.length,
    byCategory,
    top: byCategory[0] ?? null,
  };
}
