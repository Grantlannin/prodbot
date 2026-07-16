import type { CaptureNote } from './types';

export const OPEN_LOOP_ICON = '○';
export const DECISION_ICON = '◇';

export type CaptureNoteKind = 'open_loop' | 'decision';

export const OPEN_LOOPS_SECTION_LABEL = 'open loops';
export const DECISIONS_SECTION_LABEL = 'decisions i need to make';

export function noteKind(note: CaptureNote): CaptureNoteKind {
  return note.kind === 'decision' ? 'decision' : 'open_loop';
}

export function isDecisionNote(note: CaptureNote): boolean {
  return noteKind(note) === 'decision';
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

function sectionOrderField(kind: CaptureNoteKind): 'loopSortOrder' | 'decisionSortOrder' {
  return kind === 'decision' ? 'decisionSortOrder' : 'loopSortOrder';
}

function readSectionOrder(note: CaptureNote, kind: CaptureNoteKind): number | undefined {
  const field = sectionOrderField(kind);
  const value = note[field];
  if (value != null) return value;
  if (note.sortOrder != null && noteKind(note) === kind) return note.sortOrder;
  return undefined;
}

function migrateLegacySortOrders(notes: CaptureNote[]): CaptureNote[] {
  const needsLoop = notes.some(n => noteKind(n) === 'open_loop' && n.loopSortOrder == null && n.sortOrder != null);
  const needsDecision = notes.some(
    n => noteKind(n) === 'decision' && n.decisionSortOrder == null && n.sortOrder != null
  );
  if (!needsLoop && !needsDecision) return notes;

  const loops = notes.filter(n => noteKind(n) === 'open_loop');
  const decisions = notes.filter(n => noteKind(n) === 'decision');
  const loopOrder = new Map(
    [...loops]
      .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER))
      .map((n, index) => [n.id, index])
  );
  const decisionOrder = new Map(
    [...decisions]
      .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER))
      .map((n, index) => [n.id, index])
  );

  return notes.map(note => {
    if (noteKind(note) === 'decision') {
      return {
        ...note,
        decisionSortOrder: note.decisionSortOrder ?? decisionOrder.get(note.id),
      };
    }
    return {
      ...note,
      loopSortOrder: note.loopSortOrder ?? loopOrder.get(note.id),
    };
  });
}

export function orderedNotesInSection(notes: CaptureNote[], kind: CaptureNoteKind): CaptureNote[] {
  const migrated = migrateLegacySortOrders(notes);
  const section = migrated.filter(n => noteKind(n) === kind);
  const hasManual = section.some(n => readSectionOrder(n, kind) != null);
  if (!hasManual) {
    return [...section].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return [...section].sort((a, b) => {
    const ao = readSectionOrder(a, kind) ?? Number.MAX_SAFE_INTEGER;
    const bo = readSectionOrder(b, kind) ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return b.updatedAt - a.updatedAt;
  });
}

export function reorderNotesInSection(
  notes: CaptureNote[],
  fromId: string,
  beforeId: string | null,
  kind: CaptureNoteKind
): CaptureNote[] {
  const sectionOrdered = orderedNotesInSection(notes, kind);
  const fromIndex = sectionOrdered.findIndex(n => n.id === fromId);
  if (fromIndex < 0) return notes;

  const next = [...sectionOrdered];
  const [moved] = next.splice(fromIndex, 1);
  let toIndex = beforeId ? next.findIndex(n => n.id === beforeId) : next.length;
  if (toIndex < 0) toIndex = next.length;
  next.splice(toIndex, 0, moved);

  const field = sectionOrderField(kind);
  const orderById = new Map(next.map((n, index) => [n.id, index]));
  return notes.map(note => {
    const order = orderById.get(note.id);
    if (order === undefined) return note;
    return { ...note, [field]: order };
  });
}

export function prependNoteInSection(notes: CaptureNote[], note: CaptureNote): CaptureNote[] {
  const kind = noteKind(note);
  const field = sectionOrderField(kind);
  const section = orderedNotesInSection(notes, kind).map((n, index) => ({ ...n, [field]: index + 1 }));
  const other = notes.filter(n => noteKind(n) !== kind);
  return [...other, ...section, { ...note, [field]: 0 }];
}

/** @deprecated Use orderedNotesInSection */
export function orderedCaptureNotes(notes: CaptureNote[]): CaptureNote[] {
  return [...orderedNotesInSection(notes, 'open_loop'), ...orderedNotesInSection(notes, 'decision')];
}

/** @deprecated Use reorderNotesInSection */
export function reorderCaptureNotes(notes: CaptureNote[], fromId: string, beforeId: string | null): CaptureNote[] {
  const note = notes.find(n => n.id === fromId);
  if (!note) return notes;
  return reorderNotesInSection(notes, fromId, beforeId, noteKind(note));
}

/** @deprecated Use prependNoteInSection */
export function prependCaptureNote(notes: CaptureNote[], note: CaptureNote): CaptureNote[] {
  return prependNoteInSection(notes, note);
}
