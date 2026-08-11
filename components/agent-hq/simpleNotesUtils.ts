import type { SimpleNote } from './types';

export const SIMPLE_NOTES_KEY = 'agentHQ_simpleNotes';
export const SIMPLE_NOTES_SELECTED_KEY = 'agentHQ_simpleNotes_selectedId';
/** @deprecated Prefer SIMPLE_NOTES_KEY; kept for one-time localStorage migration. */
export const LEGACY_APPLE_NOTES_KEY = 'agentHQ_appleNotes';
export const LEGACY_APPLE_NOTES_SELECTED_KEY = 'agentHQ_appleNotes_selectedId';
export const HOVER_NOTES_SIZE_KEY = 'agentHQ_hoverNotesSize';

export const DEFAULT_HOVER_NOTES_SIZE = { w: 360, h: 420 };


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

export function createSimpleNote(): SimpleNote {
  const now = Date.now();
  return {
    id: makeNoteId(),
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function sortNotesByUpdated(notes: SimpleNote[]): SimpleNote[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Move appleNotes / ultra-legacy single-string notes into simpleNotes once. */
export function migrateLegacySimpleNotes(
  notes: SimpleNote[],
  setNotes: (updater: SimpleNote[] | ((prev: SimpleNote[]) => SimpleNote[])) => void,
  _selectedId?: string | null,
  setSelectedId?: (id: string | null) => void
): void {
  try {
    if (typeof window === 'undefined') return;

    const parseNotes = (raw: string | null): SimpleNote[] | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as SimpleNote[]) : null;
      } catch {
        return null;
      }
    };

    const current = parseNotes(localStorage.getItem(SIMPLE_NOTES_KEY)) ?? notes;
    const legacyApple = parseNotes(localStorage.getItem(LEGACY_APPLE_NOTES_KEY));

    if ((current.length === 0) && legacyApple && legacyApple.length > 0) {
      setNotes(legacyApple);
      localStorage.setItem(SIMPLE_NOTES_KEY, JSON.stringify(legacyApple));
      localStorage.removeItem(LEGACY_APPLE_NOTES_KEY);
    } else if (legacyApple) {
      localStorage.removeItem(LEGACY_APPLE_NOTES_KEY);
    }

    const sel = localStorage.getItem(SIMPLE_NOTES_SELECTED_KEY);
    const legacySel = localStorage.getItem(LEGACY_APPLE_NOTES_SELECTED_KEY);
    if ((!sel || sel === 'null') && legacySel && setSelectedId) {
      try {
        const parsed = JSON.parse(legacySel) as string | null;
        setSelectedId(parsed);
        localStorage.setItem(SIMPLE_NOTES_SELECTED_KEY, legacySel);
      } catch {
        /* ignore */
      }
      localStorage.removeItem(LEGACY_APPLE_NOTES_SELECTED_KEY);
    } else if (legacySel) {
      localStorage.removeItem(LEGACY_APPLE_NOTES_SELECTED_KEY);
    }

    const after = parseNotes(localStorage.getItem(SIMPLE_NOTES_KEY)) ?? notes;
    const legacyPlain = localStorage.getItem('agentHQ_notes');
    if (legacyPlain?.trim() && after.length === 0) {
      const now = Date.now();
      setNotes([
        {
          id: makeNoteId(),
          content: legacyPlain,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      localStorage.removeItem('agentHQ_notes');
    }
  } catch {
    /* ignore */
  }
}
