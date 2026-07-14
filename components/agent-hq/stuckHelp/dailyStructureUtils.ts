import type { CaptureNote } from '../types';
import { localDateKey } from '../eodReports';
import {
  buildMultiEventIcs,
  downloadIcsFile,
  navigateToUrl,
  buildGoogleCalendarUrl,
} from '../googleCalendarLink';

export const DAILY_STRUCTURE_KEY = 'agentHQ_dailyStructure';
export const RECURRING_COMMITMENTS_KEY = 'agentHQ_recurringCommitments';

export type DayBlockKind = 'commitment' | 'open_loop' | 'work';

export interface DayBlock {
  id: string;
  title: string;
  startMinutes: number;
  durationMinutes: number;
  kind: DayBlockKind;
  openLoopId?: string;
}

export interface DailyStructurePlan {
  dateKey: string;
  blocks: DayBlock[];
  updatedAt: number;
}

export interface RecurringCommitment {
  id: string;
  title: string;
  startMinutes: number;
  durationMinutes: number;
  createdAt: number;
  updatedAt: number;
}

export type DailyStructureStore = Record<string, DailyStructurePlan>;

export function makeDayBlockId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseFlexibleTime(value: string): number | null {
  const trimmed = value.trim().toLowerCase().replace(/\./g, '');
  if (!trimmed) return null;

  const clock = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (clock) {
    const h = Number(clock[1]);
    const m = Number(clock[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
  }

  const twelveHour = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(trimmed);
  if (twelveHour) {
    let h = Number(twelveHour[1]);
    const m = Number(twelveHour[2] ?? 0);
    const period = twelveHour[3];
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === 'pm' && h !== 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }

  const hourOnly = /^(\d{1,2})$/.exec(trimmed);
  if (hourOnly) {
    const h = Number(hourOnly[1]);
    if (h >= 0 && h <= 23) return h * 60;
  }

  return null;
}

export function parseTimeInput(value: string): number | null {
  return parseFlexibleTime(value);
}

export function parseTimeRangeInput(
  value: string
): { startMinutes: number; durationMinutes: number } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s*(?:-|–|—|\bto\b|\buntil\b)\s*/i).filter(Boolean);
  if (parts.length !== 2) return null;

  const startMinutes = parseFlexibleTime(parts[0]);
  const endMinutes = parseFlexibleTime(parts[1]);
  if (startMinutes == null || endMinutes == null) return null;

  return {
    startMinutes,
    durationMinutes: durationFromTimes(startMinutes, endMinutes),
  };
}

export function parseStructureBlockLine(
  text: string
): { title: string; startMinutes: number; durationMinutes: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const rangeAtEnd =
    /^(.+?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|\bto\b|\buntil\b)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i.exec(
      trimmed
    );
  if (rangeAtEnd) {
    const title = rangeAtEnd[1].trim().replace(/[,:]$/, '');
    const range = parseTimeRangeInput(`${rangeAtEnd[2]}-${rangeAtEnd[3]}`);
    if (!title || !range) return null;
    return { title, ...range };
  }

  return null;
}

export function formatMinutesLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${period}` : `${h12} ${period}`;
}

export function durationFromTimes(startMinutes: number, endMinutes: number): number {
  if (endMinutes <= startMinutes) return Math.max(15, endMinutes + 24 * 60 - startMinutes);
  return Math.max(15, endMinutes - startMinutes);
}

export function blockStartDate(dateKey: string, startMinutes: number): Date {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const h = Math.floor(startMinutes / 60);
  const m = startMinutes % 60;
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

export function sortBlocks(blocks: DayBlock[]): DayBlock[] {
  return [...blocks].sort((a, b) => a.startMinutes - b.startMinutes || a.title.localeCompare(b.title));
}

export function upsertTodayPlan(
  store: DailyStructureStore,
  blocks: DayBlock[],
  dateKey = localDateKey()
): DailyStructureStore {
  return {
    ...store,
    [dateKey]: {
      dateKey,
      blocks: sortBlocks(blocks),
      updatedAt: Date.now(),
    },
  };
}

export function getTodayPlan(store: DailyStructureStore, dateKey = localDateKey()): DailyStructurePlan | null {
  return store[dateKey] ?? null;
}

export function upsertRecurringCommitment(
  items: RecurringCommitment[],
  block: Pick<DayBlock, 'title' | 'startMinutes' | 'durationMinutes'>
): RecurringCommitment[] {
  const title = block.title.trim();
  if (!title) return items;
  const existing = items.find(
    i =>
      i.title.toLowerCase() === title.toLowerCase() &&
      i.startMinutes === block.startMinutes &&
      i.durationMinutes === block.durationMinutes
  );
  if (existing) {
    return items.map(i =>
      i.id === existing.id ? { ...i, updatedAt: Date.now() } : i
    );
  }
  const now = Date.now();
  return [
    {
      id: makeDayBlockId(),
      title,
      startMinutes: block.startMinutes,
      durationMinutes: block.durationMinutes,
      createdAt: now,
      updatedAt: now,
    },
    ...items,
  ];
}

export function createOpenLoopNote(
  title: string,
  startMinutes: number,
  durationMinutes: number,
  dateKey = localDateKey()
): CaptureNote {
  const now = Date.now();
  const start = formatMinutesLabel(startMinutes);
  const end = formatMinutesLabel(startMinutes + durationMinutes);
  return {
    id: makeDayBlockId(),
    title: title.trim(),
    body: `Scheduled today (${dateKey}): ${start} – ${end}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function blockKindLabel(kind: DayBlockKind): string {
  if (kind === 'commitment') return 'Commitment';
  if (kind === 'open_loop') return 'Open loop';
  return 'Work';
}

export function blockKindColor(kind: DayBlockKind): { bg: string; border: string; text: string } {
  if (kind === 'commitment') return { bg: '#f1f5f9', border: '#94a3b8', text: '#334155' };
  if (kind === 'open_loop') return { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' };
  return { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' };
}

export function exportDayToGoogleCalendar(blocks: DayBlock[], dateKey = localDateKey()) {
  if (typeof window === 'undefined' || blocks.length === 0) return;
  const sorted = sortBlocks(blocks);
  if (sorted.length === 1) {
    const block = sorted[0];
    const url = buildGoogleCalendarUrl({
      title: block.title,
      details: blockKindLabel(block.kind),
      start: blockStartDate(dateKey, block.startMinutes),
      durationMinutes: block.durationMinutes,
    });
    navigateToUrl(url);
    return;
  }
  const ics = buildMultiEventIcs(
    sorted.map(block => ({
      title: block.title,
      details: blockKindLabel(block.kind),
      start: blockStartDate(dateKey, block.startMinutes),
      durationMinutes: block.durationMinutes,
      uid: `produc-day-${block.id}@produc`,
    }))
  );
  downloadIcsFile(ics, `my-day-${dateKey}.ics`);
}

export const DAY_TIMELINE_START = 6 * 60;
export const DAY_TIMELINE_END = 23 * 60;
export const DAY_TIMELINE_PX_PER_MIN = 1.1;
