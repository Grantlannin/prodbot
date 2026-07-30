import { formatDuration } from '../chatLogic';

export interface WindDownItem {
  id: string;
  label: string;
  source: 'tracker';
  trackerMs?: number;
  trackerSessions?: number;
}

export interface ProjectWorkStat {
  name: string;
  totalMs: number;
  count: number;
}

/** Wind-down context prompts only for timer-tracked work — not typed Done Today entries. */
export function buildWindDownItems(projectStats: ProjectWorkStat[]): WindDownItem[] {
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

  return items;
}

export function windDownItemLabel(item: WindDownItem): string {
  if (item.trackerMs) {
    return `${item.label} (${formatDuration(item.trackerMs)} tracked)`;
  }
  return item.label;
}
