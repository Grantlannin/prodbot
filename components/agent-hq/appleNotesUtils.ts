import type { AppleNote } from './types';

export const APPLE_NOTES_KEY = 'agentHQ_appleNotes';
export const APPLE_NOTES_SELECTED_KEY = 'agentHQ_appleNotes_selectedId';
export const HOVER_NOTES_SIZE_KEY = 'agentHQ_hoverNotesSize';
export const HOVER_NOTES_BOUNDS_KEY = 'agentHQ_hoverNotesExpandedBounds';

export const DEFAULT_HOVER_NOTES_SIZE = { w: 360, h: 420 };
export const HOVER_NOTES_MINIMIZED_SIZE = { w: 300, h: 76 };

export interface HoverNotesBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DAY = 86400000;

export function makeNoteId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function firstNoteLine(text: string): string {
  const line = text.split(/\r?\n/)[0]?.trim() ?? '';
  if (!line) return 'New Note';
  return line.length > 72 ? line.slice(0, 69) + '…' : line;
}

export function noteBodyPreview(text: string): string {
  const raw = text.split(/\r?\n/);
  const first = raw[0]?.trim() ?? '';
  if (raw.length >= 2) {
    const rest = raw.slice(1).join(' ').trim();
    if (!rest) return '';
    return rest.length > 56 ? rest.slice(0, 53) + '…' : rest;
  }
  if (first.length > 72) return first.slice(72, 130) + (first.length > 130 ? '…' : '');
  return '';
}

export function formatNoteTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

export function createAppleNote(): AppleNote {
  const now = Date.now();
  return {
    id: makeNoteId(),
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function sortNotesByUpdated(notes: AppleNote[]): AppleNote[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function migrateLegacyAppleNotes(
  notes: AppleNote[],
  setNotes: (updater: AppleNote[] | ((prev: AppleNote[]) => AppleNote[])) => void
): void {
  try {
    const legacy = localStorage.getItem('agentHQ_notes');
    if (!legacy?.trim() || notes.length > 0) return;
    const now = Date.now();
    setNotes([
      {
        id: makeNoteId(),
        content: legacy,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    localStorage.removeItem('agentHQ_notes');
  } catch {
    /* ignore */
  }
}
