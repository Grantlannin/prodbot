import { localDateKey } from '../eodReports';

export const WIND_DOWN_EOD_NOTES_KEY = 'agentHQ_windDownEodNotes';

export interface WindDownEodNotes {
  dateKey: string;
  betterUseOfTime?: string;
}

export function readWindDownEodNotes(now = Date.now()): WindDownEodNotes | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIND_DOWN_EOD_NOTES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WindDownEodNotes;
    if (parsed.dateKey !== localDateKey(now)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWindDownBetterUse(text: string, now = Date.now()): void {
  if (typeof window === 'undefined') return;
  const trimmed = text.trim();
  if (!trimmed) return;
  const next: WindDownEodNotes = {
    dateKey: localDateKey(now),
    betterUseOfTime: trimmed,
  };
  localStorage.setItem(WIND_DOWN_EOD_NOTES_KEY, JSON.stringify(next));
}

export function windDownBetterUsePrefill(now = Date.now()): string {
  return readWindDownEodNotes(now)?.betterUseOfTime?.trim() ?? '';
}
