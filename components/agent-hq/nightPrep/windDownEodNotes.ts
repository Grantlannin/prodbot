import { localDateKey } from '../eodReports';

export const WIND_DOWN_EOD_NOTES_KEY = 'agentHQ_windDownEodNotes';

export const MISSED_DONE_TODAY_LABEL = "Didn't get done what I wanted to";

export interface WindDownEodNotes {
  dateKey: string;
  betterUseOfTime?: string;
  /** "What happened?" from the didn't-get-done wind-down path */
  missedWhatHappened?: string;
  /** Prep/system answer for tomorrow from that path */
  missedTomorrowPrep?: string;
}

function readRaw(): WindDownEodNotes | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIND_DOWN_EOD_NOTES_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WindDownEodNotes;
  } catch {
    return null;
  }
}

export function readWindDownEodNotes(now = Date.now()): WindDownEodNotes | null {
  const parsed = readRaw();
  if (!parsed || parsed.dateKey !== localDateKey(now)) return null;
  return parsed;
}

function writeNotes(next: WindDownEodNotes): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WIND_DOWN_EOD_NOTES_KEY, JSON.stringify(next));
}

export function saveWindDownBetterUse(text: string, now = Date.now()): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const existing = readWindDownEodNotes(now);
  writeNotes({
    dateKey: localDateKey(now),
    betterUseOfTime: trimmed,
    missedWhatHappened: existing?.missedWhatHappened,
    missedTomorrowPrep: existing?.missedTomorrowPrep,
  });
}

export function saveWindDownMissedPath(whatHappened: string, tomorrowPrep: string, now = Date.now()): void {
  const happened = whatHappened.trim();
  const prep = tomorrowPrep.trim();
  if (!happened && !prep) return;
  const existing = readWindDownEodNotes(now);
  writeNotes({
    dateKey: localDateKey(now),
    betterUseOfTime: existing?.betterUseOfTime,
    missedWhatHappened: happened || existing?.missedWhatHappened,
    missedTomorrowPrep: prep || existing?.missedTomorrowPrep,
  });
}

export function windDownBetterUsePrefill(now = Date.now()): string {
  return readWindDownEodNotes(now)?.betterUseOfTime?.trim() ?? '';
}

export function windDownMissedPrefill(now = Date.now()): {
  whatHappened: string;
  tomorrowPrep: string;
} {
  const notes = readWindDownEodNotes(now);
  return {
    whatHappened: notes?.missedWhatHappened?.trim() ?? '',
    tomorrowPrep: notes?.missedTomorrowPrep?.trim() ?? '',
  };
}
