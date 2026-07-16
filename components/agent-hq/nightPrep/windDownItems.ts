import type { DoneTodayItem } from '../types';
import { formatDuration } from '../chatLogic';

export interface WindDownItem {
  id: string;
  label: string;
  source: 'tracker' | 'done_today';
  trackerMs?: number;
  trackerSessions?: number;
  doneTodayItem?: DoneTodayItem;
}

export interface ProjectWorkStat {
  name: string;
  totalMs: number;
  count: number;
}

export function buildWindDownItems(
  projectStats: ProjectWorkStat[],
  doneTodayItems: DoneTodayItem[]
): WindDownItem[] {
  const items: WindDownItem[] = [];
  const seen = new Set<string>();

  for (const stat of projectStats) {
    const name = stat.name.trim();
    if (!name || stat.totalMs <= 0) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `tracker-${key}`,
      label: name,
      source: 'tracker',
      trackerMs: stat.totalMs,
      trackerSessions: stat.count,
    });
  }

  for (const done of doneTodayItems) {
    const text = done.text.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: done.id,
      label: text,
      source: 'done_today',
      doneTodayItem: done,
    });
  }

  return items;
}

export function windDownItemLabel(item: WindDownItem): string {
  if (item.source === 'tracker' && item.trackerMs) {
    return `${item.label} (${formatDuration(item.trackerMs)} tracked)`;
  }
  const detail = item.doneTodayItem?.detail?.trim();
  return detail ? `${item.label} — ${detail}` : item.label;
}
