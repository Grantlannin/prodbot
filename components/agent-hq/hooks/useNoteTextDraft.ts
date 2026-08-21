'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Local draft for note textareas so typing stays smooth.
 * Persists (and bumps updatedAt) on debounce / blur / note switch — not every keystroke.
 */
export function useNoteTextDraft(
  noteId: string | null,
  storedContent: string,
  commit: (noteId: string, content: string) => void,
  debounceMs = DEFAULT_DEBOUNCE_MS
) {
  const [draft, setDraft] = useState(storedContent);
  const focusedRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const noteIdRef = useRef(noteId);
  const storedRef = useRef(storedContent);
  storedRef.current = storedContent;
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushNote = useCallback(
    (id: string | null, text: string) => {
      clearTimer();
      if (!id) return;
      if (text === storedRef.current && id === noteIdRef.current) return;
      commitRef.current(id, text);
    },
    [clearTimer]
  );

  const flush = useCallback(() => {
    flushNote(noteIdRef.current, draftRef.current);
  }, [flushNote]);

  // Switch notes: flush previous draft, load new content.
  useEffect(() => {
    if (noteId === noteIdRef.current) return;
    const prevId = noteIdRef.current;
    const prevDraft = draftRef.current;
    clearTimer();
    if (prevId) commitRef.current(prevId, prevDraft);
    noteIdRef.current = noteId;
    focusedRef.current = false;
    setDraft(storedContent);
    draftRef.current = storedContent;
  }, [noteId, storedContent, clearTimer]);

  // External updates (other panel / floating window) while not focused.
  useEffect(() => {
    if (noteId !== noteIdRef.current) return;
    if (focusedRef.current) return;
    if (storedContent === draftRef.current) return;
    setDraft(storedContent);
    draftRef.current = storedContent;
  }, [noteId, storedContent]);

  useEffect(
    () => () => {
      clearTimer();
      const id = noteIdRef.current;
      if (id) commitRef.current(id, draftRef.current);
    },
    [clearTimer]
  );

  const onChange = useCallback(
    (text: string) => {
      setDraft(text);
      draftRef.current = text;
      clearTimer();
      const id = noteIdRef.current;
      if (!id) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        commitRef.current(id, text);
      }, debounceMs);
    },
    [clearTimer, debounceMs]
  );

  const onFocus = useCallback(() => {
    focusedRef.current = true;
  }, []);

  const onBlur = useCallback(() => {
    focusedRef.current = false;
    flush();
  }, [flush]);

  return { draft, onChange, onFocus, onBlur, flush };
}
