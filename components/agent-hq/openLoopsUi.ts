import type { CaptureNote } from './types';

export const OPEN_LOOP_ICON = '○';
export const DECISION_ICON = '◇';

export function isDecisionNote(note: CaptureNote): boolean {
  return note.kind === 'decision';
}

export function noteListLabel(note: CaptureNote, skipLines: string[]): string {
  const t = note.title.trim();
  const raw =
    t ||
    (note.body
      .split(/\r?\n/)
      .find(l => l.trim() && !skipLines.some(s => l.trim().startsWith(s)))
      ?.trim() ??
      'Untitled');
  return raw.length > 36 ? raw.slice(0, 33) + '…' : raw;
}

export function noteTabIcon(note: CaptureNote): string {
  return isDecisionNote(note) ? DECISION_ICON : OPEN_LOOP_ICON;
}

export function orderedCaptureNotes(notes: CaptureNote[]): CaptureNote[] {
  const hasManualOrder = notes.some(n => n.sortOrder != null);
  if (!hasManualOrder) {
    return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return [...notes].sort((a, b) => {
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return b.updatedAt - a.updatedAt;
  });
}

export function reorderCaptureNotes(notes: CaptureNote[], fromId: string, beforeId: string | null): CaptureNote[] {
  const ordered = orderedCaptureNotes(notes);
  const fromIndex = ordered.findIndex(n => n.id === fromId);
  if (fromIndex < 0) return notes;

  const next = [...ordered];
  const [moved] = next.splice(fromIndex, 1);

  let toIndex = beforeId ? next.findIndex(n => n.id === beforeId) : next.length;
  if (toIndex < 0) toIndex = next.length;
  next.splice(toIndex, 0, moved);

  return next.map((n, index) => ({ ...n, sortOrder: index }));
}

export function prependCaptureNote(notes: CaptureNote[], note: CaptureNote): CaptureNote[] {
  const ordered = orderedCaptureNotes(notes).map((n, index) => ({ ...n, sortOrder: index + 1 }));
  return [{ ...note, sortOrder: 0 }, ...ordered];
}
