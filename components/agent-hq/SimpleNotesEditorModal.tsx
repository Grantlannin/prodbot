'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import {
  clampNoteFontSize,
  createNoteTab,
  cssPxToNoteSize,
  editableHtmlToStoredNote,
  htmlStringToStoredNote,
  NOTE_FONT_SIZE_MAX,
  NOTE_FONT_SIZE_MIN,
  NOTE_FONT_SIZES,
  NOTE_TABS_MAX,
  noteSizeToCssPx,
  noteTextToEditableHtml,
  parseNoteTabs,
  serializeNoteTabs,
  storedNoteToEditableHtml,
  type NoteFontSize,
  type NoteTab,
} from './noteFormatUtils';
import { CornerResizeHandles, useCornerResize } from './hooks/useCornerResize';

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const COMMIT_DEBOUNCE_MS = 300;
const PANEL_BASE_W = 520;
const PANEL_BASE_H = 420;

function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (!range) return null;
    return { node: range.startContainer, offset: range.startOffset };
  }
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  return { node: pos.offsetNode, offset: pos.offset };
}
/**
 * Dim + click-catcher as one plain filled layer (not React-owned).
 * A flat `background` is cheap; `box-shadow: 0 0 0 100vmax` is not (slow tear-down).
 */
const NOTES_DIM_ID = 'dw-notes-editor-dim';

function mountNotesDim(onMouseDown: () => void): HTMLDivElement {
  document.getElementById(NOTES_DIM_ID)?.remove();
  const el = document.createElement('div');
  el.id = NOTES_DIM_ID;
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.zIndex = '10000';
  el.style.background = 'rgba(15, 23, 42, 0.28)';
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    onMouseDown();
  });
  document.body.appendChild(el);
  return el;
}

function hideNotesDimNow() {
  const el = document.getElementById(NOTES_DIM_ID);
  if (el) el.style.display = 'none';
}

function unmountNotesDim() {
  document.getElementById(NOTES_DIM_ID)?.remove();
}

interface SimpleNotesEditorModalProps {
  open: boolean;
  /** Stable id for the note being edited — only used to (re)load the DOM. */
  syncKey?: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

/**
 * Project notes/context editor.
 * Keeps typing in the contentEditable DOM; only loads from `value` when opening
 * or switching notes — never while focused (avoids caret jumps).
 */
export default function SimpleNotesEditorModal({
  open,
  syncKey = '',
  title,
  value,
  onChange,
  onClose,
}: SimpleNotesEditorModalProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const syncKeyRef = useRef('');
  const draftRef = useRef('');
  const lastCommittedRef = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const sizeWrapRef = useRef<HTMLDivElement>(null);
  const ignoreToolbarClickRef = useRef(false);
  /** Blocks blur→commit from overwriting a size just picked from the menu. */
  const applyingSizeRef = useRef(false);
  const sizeDraftRef = useRef('14');
  const fontSizeRef = useRef<NoteFontSize>(14);
  const [boldActive, setBoldActive] = useState(false);
  const [fontSize, setFontSize] = useState<NoteFontSize>(14);
  const [sizeDraft, setSizeDraft] = useState('14');
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [panelSize, setPanelSize] = useState({ w: PANEL_BASE_W, h: PANEL_BASE_H });
  const [tabs, setTabs] = useState<NoteTab[]>(() => parseNoteTabs('').tabs);
  const [activeTabId, setActiveTabId] = useState(() => parseNoteTabs('').activeId);
  const closingRef = useRef(false);
  const tabsRef = useRef<NoteTab[]>(tabs);
  const activeTabIdRef = useRef(activeTabId);
  /** Drag-select: freeze Y when pointer leaves left/right so selection doesn't jump up a line. */
  const dragSelectRef = useRef<{
    anchorNode: Node;
    anchorOffset: number;
    lastInBoundsY: number;
  } | null>(null);
  sizeDraftRef.current = sizeDraft;
  fontSizeRef.current = fontSize;
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  useEffect(() => {
    if (open) closingRef.current = false;
  }, [open]);

  const panelMaxW = PANEL_BASE_W * 2;
  const panelMaxH =
    typeof window !== 'undefined'
      ? Math.min(PANEL_BASE_H * 2, window.innerHeight - 48)
      : PANEL_BASE_H * 2;
  const { onResizeStart } = useCornerResize({
    size: panelSize,
    onSizeChange: setPanelSize,
    minW: 360,
    maxW: panelMaxW,
    minH: 280,
    maxH: panelMaxH,
  });

  useEffect(() => {
    setSizeDraft(String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    if (!open) return;
    const h = Math.min(PANEL_BASE_H, Math.round(window.innerHeight * 0.7));
    setPanelSize({ w: PANEL_BASE_W, h });
  }, [open, syncKey]);

  useEffect(() => {
    if (!sizeMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!sizeWrapRef.current?.contains(e.target as Node)) setSizeMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [sizeMenuOpen]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const commitDraft = useCallback(() => {
    clearTimer();
    const next = draftRef.current;
    if (next === lastCommittedRef.current) return;
    lastCommittedRef.current = next;
    onChangeRef.current(next);
  }, [clearTimer]);

  /** Sync editor → tab bodies + draftRef only (no React state — avoids jank on blur/close). */
  const syncDraftFromEditor = useCallback((): NoteTab[] => {
    const el = editorRef.current;
    // If the editor is already gone (closing), keep the last draft — don't wipe the active tab.
    if (!el) return tabsRef.current;
    const body = editableHtmlToStoredNote(el);
    const next = tabsRef.current.map(t =>
      t.id === activeTabIdRef.current ? { ...t, body } : t
    );
    tabsRef.current = next;
    draftRef.current = serializeNoteTabs({
      tabs: next.slice(0, NOTE_TABS_MAX),
      activeId: activeTabIdRef.current,
    });
    return next;
  }, []);

  const publishTabsState = useCallback((nextTabs: NoteTab[], nextActiveId: string) => {
    const tabsClamped = nextTabs.slice(0, NOTE_TABS_MAX).map((t, i) => ({
      ...t,
      title: t.title.trim() || String(i + 1),
    }));
    const activeId = tabsClamped.some(t => t.id === nextActiveId)
      ? nextActiveId
      : tabsClamped[0]?.id ?? '';
    tabsRef.current = tabsClamped;
    activeTabIdRef.current = activeId;
    setTabs(tabsClamped);
    setActiveTabId(activeId);
    draftRef.current = serializeNoteTabs({ tabs: tabsClamped, activeId });
  }, []);

  const rangeInEditor = useCallback((range: Range | null | undefined): range is Range => {
    const editor = editorRef.current;
    if (!range || !editor) return false;
    try {
      return editor.contains(range.commonAncestorContainer);
    } catch {
      return false;
    }
  }, []);

  /** Keep the last non-collapsed editor highlight for toolbar actions. */
  const saveSelectionFromEditor = useCallback(
    (opts?: { allowCollapsed?: boolean }) => {
      const sel = window.getSelection();
      const editor = editorRef.current;
      if (!sel || sel.rangeCount === 0 || !editor) return;
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      if (range.collapsed && !opts?.allowCollapsed) return;
      savedRangeRef.current = range.cloneRange();
    },
    []
  );

  const restoreSelection = useCallback(() => {
    const range = savedRangeRef.current;
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!rangeInEditor(range) || !editor || !sel) return false;
    try {
      editor.focus();
      sel.removeAllRanges();
      sel.addRange(range.cloneRange());
      return !sel.isCollapsed;
    } catch {
      return false;
    }
  }, [rangeInEditor]);

  const syncToolbarFromEditorSelection = useCallback(() => {
    if (applyingSizeRef.current) return;
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!sel || !editor || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    // Only overwrite the saved highlight with a real selection — never a caret.
    if (!range.collapsed) {
      savedRangeRef.current = range.cloneRange();
    }

    try {
      setBoldActive(document.queryCommandState('bold'));
    } catch {
      setBoldActive(false);
    }
    const node = sel.anchorNode;
    let el: HTMLElement | null =
      node instanceof HTMLElement ? node : node?.parentElement instanceof HTMLElement ? node.parentElement : null;
    if (!el || !editor.contains(el)) return;
    let sized: HTMLElement | null = el;
    let inlinePx: number | null = null;
    while (sized && editor.contains(sized)) {
      const raw = sized.style?.fontSize;
      if (raw) {
        const n = Number.parseFloat(raw);
        if (Number.isFinite(n)) {
          inlinePx = Math.round(n);
          break;
        }
      }
      sized = sized.parentElement;
    }
    const px =
      inlinePx ?? Math.round(Number.parseFloat(window.getComputedStyle(el).fontSize || '14'));
    const next = cssPxToNoteSize(px);
    setFontSize(next);
    setSizeDraft(String(next));
  }, []);

  // Capture highlights even when mouseup lands outside the editor (e.g. on the toolbar).
  useEffect(() => {
    if (!open) return;
    const onSelectionChange = () => {
      if (applyingSizeRef.current) return;
      const sel = window.getSelection();
      const editor = editorRef.current;
      if (!sel || !editor || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      savedRangeRef.current = range.cloneRange();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [open]);

  // Browser contentEditable: dragging left/right off the editor hit-tests prior lines
  // ("selects up"). While the pointer is outside horizontally, freeze Y and drive
  // selection ourselves so it only moves lines when the cursor is actually over them.
  useEffect(() => {
    if (!open) return;

    const onMove = (e: PointerEvent) => {
      const drag = dragSelectRef.current;
      const editor = editorRef.current;
      if (!drag || !editor || (e.buttons & 1) === 0) return;

      const rect = editor.getBoundingClientRect();
      if (rect.width <= 2 || rect.height <= 2) return;

      const outsideX = e.clientX < rect.left || e.clientX > rect.right;
      const x = Math.min(rect.right - 1, Math.max(rect.left + 1, e.clientX));
      let y: number;
      if (outsideX) {
        y = drag.lastInBoundsY;
      } else {
        y = Math.min(rect.bottom - 1, Math.max(rect.top + 1, e.clientY));
        drag.lastInBoundsY = y;
      }

      const caret = caretFromPoint(x, y);
      if (!caret || !editor.contains(caret.node)) return;
      if (!drag.anchorNode.isConnected || !editor.contains(drag.anchorNode)) {
        dragSelectRef.current = null;
        return;
      }

      const sel = window.getSelection();
      if (!sel) return;
      try {
        sel.setBaseAndExtent(drag.anchorNode, drag.anchorOffset, caret.node, caret.offset);
      } catch {
        /* ignore invalid extent */
      }
    };

    const onUp = () => {
      dragSelectRef.current = null;
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [open]);

  const scheduleCommit = useCallback(() => {
    if (composingRef.current) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      commitDraft();
    }, COMMIT_DEBOUNCE_MS);
  }, [clearTimer, commitDraft]);

  const loadTabBodyIntoEditor = useCallback(
    (body: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.innerHTML = storedNoteToEditableHtml(body);
      savedRangeRef.current = null;
      window.setTimeout(() => {
        el.focus();
        syncToolbarFromEditorSelection();
      }, 0);
    },
    [syncToolbarFromEditorSelection]
  );

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    // Undim first (flat layer + display:none), then panel. Nothing else this turn.
    hideNotesDimNow();
    const panel = panelRef.current;
    if (panel) panel.style.display = 'none';

    window.setTimeout(() => {
      unmountNotesDim();
      clearTimer();
      const rawHtml = editorRef.current?.innerHTML ?? null;
      const tabsSnap = tabsRef.current.map(t => ({ ...t }));
      const activeId = activeTabIdRef.current;
      const draftBefore = draftRef.current;

      onClose();

      window.setTimeout(() => {
        let serialized = draftBefore;
        if (rawHtml !== null) {
          const body = htmlStringToStoredNote(rawHtml);
          const nextTabs = tabsSnap.map(t =>
            t.id === activeId ? { ...t, body } : t
          );
          tabsRef.current = nextTabs;
          serialized = serializeNoteTabs({ tabs: nextTabs, activeId });
          draftRef.current = serialized;
        }
        if (serialized !== lastCommittedRef.current) {
          lastCommittedRef.current = serialized;
          onChangeRef.current(serialized);
        }
      }, 0);
    }, 0);
  }, [clearTimer, onClose]);

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  // Imperative dim — depend only on `open` (parent onClose identity changes every render).
  useEffect(() => {
    if (!open) {
      unmountNotesDim();
      return;
    }
    mountNotesDim(() => handleCloseRef.current());
    return () => unmountNotesDim();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sizeMenuOpen) {
          setSizeMenuOpen(false);
          return;
        }
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, handleClose, sizeMenuOpen]);

  const selectTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabIdRef.current) return;
      const nextTabs = syncDraftFromEditor();
      const target = nextTabs.find(t => t.id === tabId);
      if (!target) return;
      publishTabsState(nextTabs, tabId);
      commitDraft();
      loadTabBodyIntoEditor(target.body);
    },
    [syncDraftFromEditor, publishTabsState, commitDraft, loadTabBodyIntoEditor]
  );

  const addTab = useCallback(() => {
    if (tabsRef.current.length >= NOTE_TABS_MAX) return;
    const nextTabs = syncDraftFromEditor();
    const tab = createNoteTab(nextTabs.length + 1);
    const tabsNext = [...nextTabs, tab];
    publishTabsState(tabsNext, tab.id);
    commitDraft();
    loadTabBodyIntoEditor('');
  }, [syncDraftFromEditor, publishTabsState, commitDraft, loadTabBodyIntoEditor]);

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabsRef.current.length <= 1) return;
      // Never close the first tab.
      if (tabId === tabsRef.current[0]?.id) return;
      const flushed = syncDraftFromEditor();
      const removeIdx = flushed.findIndex(t => t.id === tabId);
      if (removeIdx < 0) return;
      const nextTabs = flushed.filter(t => t.id !== tabId);
      if (nextTabs.length === 0) return;
      const switching = activeTabIdRef.current === tabId;
      const nextActive = switching
        ? nextTabs[Math.max(0, removeIdx - 1)]?.id ?? nextTabs[0]!.id
        : activeTabIdRef.current;
      const renumbered = nextTabs.map((t, i) => ({ ...t, title: String(i + 1) }));
      publishTabsState(renumbered, nextActive);
      commitDraft();
      if (switching) {
        const body = renumbered.find(t => t.id === nextActive)?.body ?? '';
        loadTabBodyIntoEditor(body);
      }
    },
    [syncDraftFromEditor, publishTabsState, commitDraft, loadTabBodyIntoEditor]
  );

  // Load DOM only when opening or switching note targets — never on every parent value tick.
  useEffect(() => {
    if (!open) {
      // handleClose already persisted. Only fallback-save if we didn't go through handleClose.
      if (wasOpenRef.current && !closingRef.current) {
        clearTimer();
        syncDraftFromEditor();
        const next = draftRef.current;
        if (next !== lastCommittedRef.current) {
          lastCommittedRef.current = next;
          onChangeRef.current(next);
        }
      }
      wasOpenRef.current = false;
      syncKeyRef.current = '';
      clearTimer();
      return;
    }

    const el = editorRef.current;
    if (!el) return;

    const justOpened = !wasOpenRef.current;
    const keyChanged = syncKey !== syncKeyRef.current;
    wasOpenRef.current = true;

    if (!justOpened && !keyChanged) return;

    if (!justOpened && keyChanged) {
      syncDraftFromEditor();
      commitDraft();
    }

    syncKeyRef.current = syncKey;
    const incoming = valueRef.current;
    const parsed = parseNoteTabs(incoming);
    tabsRef.current = parsed.tabs;
    activeTabIdRef.current = parsed.activeId;
    setTabs(parsed.tabs);
    setActiveTabId(parsed.activeId);
    const serialized = serializeNoteTabs(parsed);
    draftRef.current = serialized;
    lastCommittedRef.current = serialized;
    const activeBody = parsed.tabs.find(t => t.id === parsed.activeId)?.body ?? '';
    el.innerHTML = storedNoteToEditableHtml(activeBody);
    savedRangeRef.current = null;

    const timer = window.setTimeout(() => {
      el.focus();
      syncToolbarFromEditorSelection();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, syncKey, clearTimer, commitDraft, syncDraftFromEditor, syncToolbarFromEditorSelection]);

  useEffect(
    () => () => {
      clearTimer();
      const next = draftRef.current;
      if (next !== lastCommittedRef.current) {
        lastCommittedRef.current = next;
        onChangeRef.current(next);
      }
    },
    [clearTimer]
  );

  const handleInput = () => {
    syncDraftFromEditor();
    scheduleCommit();
  };

  const armIgnoreToolbarClicks = () => {
    ignoreToolbarClickRef.current = true;
    window.setTimeout(() => {
      ignoreToolbarClickRef.current = false;
    }, 400);
  };

  const cloneUsableEditorRange = useCallback(
    (range: Range | null | undefined): Range | null => {
      const editor = editorRef.current;
      if (!range || !editor || range.collapsed) return null;
      try {
        if (!range.startContainer.isConnected || !range.endContainer.isConnected) return null;
        if (!editor.contains(range.commonAncestorContainer)) return null;
        return range.cloneRange();
      } catch {
        return null;
      }
    },
    []
  );

  const unwrapBoldInRange = (range: Range) => {
    const editor = editorRef.current;
    if (!editor) return;
    const strongs = editor.querySelectorAll('strong, b');
    strongs.forEach(el => {
      try {
        if (!range.intersectsNode(el)) return;
      } catch {
        return;
      }
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
  };

  const toggleBold = () => {
    if (ignoreToolbarClickRef.current) return;
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    const liveInEditor =
      !!sel &&
      sel.rangeCount > 0 &&
      editor.contains(sel.getRangeAt(0).commonAncestorContainer);

    if (liveInEditor && sel!.isCollapsed) {
      // Caret already in the editor — toggle bold for next typing; do NOT
      // re-select a stale toolbar bookmark (that "grabs" the old text).
      editor.focus();
    } else if (!liveInEditor) {
      // Focus left for the toolbar — restore the last highlight if we still have one.
      const restored = restoreSelection();
      if (!restored) {
        editor.focus();
        const fallback = cloneUsableEditorRange(savedRangeRef.current);
        const s = window.getSelection();
        if (fallback && s) {
          try {
            s.removeAllRanges();
            s.addRange(fallback);
          } catch {
            /* ignore */
          }
        }
      }
    }
    // else: live non-collapsed selection — use it as-is

    let wasBold = false;
    try {
      wasBold = document.queryCommandState('bold');
    } catch {
      wasBold = boldActive;
    }

    document.execCommand('bold', false);

    const selAfter = window.getSelection();
    let isBold = false;
    try {
      isBold = document.queryCommandState('bold');
    } catch {
      isBold = !wasBold;
    }

    // execCommand sometimes fails to unbold nested <strong><span>…</span></strong>.
    if (wasBold && isBold && selAfter && selAfter.rangeCount > 0 && !selAfter.isCollapsed) {
      unwrapBoldInRange(selAfter.getRangeAt(0));
      isBold = false;
    }

    // Park caret at the end of the formatted span so the next keystroke types
    // new text instead of replacing the still-highlighted run.
    if (selAfter && selAfter.rangeCount > 0 && !selAfter.isCollapsed) {
      try {
        const end = selAfter.getRangeAt(0).cloneRange();
        end.collapse(false);
        selAfter.removeAllRanges();
        selAfter.addRange(end);
      } catch {
        /* ignore */
      }
    }
    savedRangeRef.current = null;

    setBoldActive(isBold);
    handleInput();
  };

  /**
   * Apply font-size by wrapping selected text nodes in spans.
   * Works inside/across <strong> (surroundContents often fails after bold).
   * Returns a range covering the sized content when possible.
   */
  const applySizeToRange = (range: Range, size: number): Range | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const walkRoot =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement ?? editor
        : (range.commonAncestorContainer as Node);

    const texts: Text[] = [];
    const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (!editor.contains(node)) return NodeFilter.FILTER_REJECT;
        try {
          if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    if (texts.length === 0) return null;

    let firstSized: Node | null = null;
    let lastSized: Node | null = null;

    // Process from the end so splitText offsets stay valid.
    for (let i = texts.length - 1; i >= 0; i--) {
      const text = texts[i]!;
      let start = 0;
      let end = text.length;
      if (text === range.startContainer) start = range.startOffset;
      if (text === range.endContainer) end = range.endOffset;
      if (text !== range.startContainer && text !== range.endContainer) {
        start = 0;
        end = text.length;
      } else if (text === range.startContainer && text !== range.endContainer) {
        end = text.length;
      } else if (text === range.endContainer && text !== range.startContainer) {
        start = 0;
      }
      if (start < 0) start = 0;
      if (end > text.length) end = text.length;
      if (start >= end) continue;

      let piece = text;
      if (start > 0) piece = piece.splitText(start);
      if (end - start < piece.length) piece.splitText(end - start);

      const parent = piece.parentElement;
      if (!parent) continue;

      const cssPx = noteSizeToCssPx(size);
      let sized: Node = piece;
      // Reuse a single-child size span; otherwise wrap (including inside <strong>).
      if (parent.tagName === 'SPAN' && parent.childNodes.length === 1) {
        parent.style.fontSize = `${cssPx}px`;
        sized = parent;
      } else {
        const span = document.createElement('span');
        span.style.fontSize = `${cssPx}px`;
        parent.insertBefore(span, piece);
        span.appendChild(piece);
        sized = span;
      }

      lastSized = lastSized ?? sized;
      firstSized = sized;
    }

    if (!firstSized || !lastSized) return null;
    try {
      const next = document.createRange();
      next.setStartBefore(firstSized);
      next.setEndAfter(lastSized);
      return next;
    } catch {
      return null;
    }
  };

  /** Apply px size to the last highlighted editor range only. */
  const applyFontSize = (rawSize: number) => {
    const size = clampNoteFontSize(rawSize);
    applyingSizeRef.current = true;
    setFontSize(size);
    setSizeDraft(String(size));
    sizeDraftRef.current = String(size);
    fontSizeRef.current = size;

    const editor = editorRef.current;
    if (!editor) {
      window.setTimeout(() => {
        applyingSizeRef.current = false;
      }, 250);
      return;
    }

    armIgnoreToolbarClicks();

    const sel = window.getSelection();
    let work =
      sel && sel.rangeCount > 0 ? cloneUsableEditorRange(sel.getRangeAt(0)) : null;
    if (!work) work = cloneUsableEditorRange(savedRangeRef.current);
    if (!work) {
      window.setTimeout(() => {
        applyingSizeRef.current = false;
      }, 250);
      return;
    }

    editor.focus();
    if (!sel) {
      window.setTimeout(() => {
        applyingSizeRef.current = false;
      }, 250);
      return;
    }
    try {
      sel.removeAllRanges();
      sel.addRange(work);
    } catch {
      // Stale bookmark (e.g. after bold) — give up cleanly.
      savedRangeRef.current = null;
      window.setTimeout(() => {
        applyingSizeRef.current = false;
      }, 250);
      return;
    }
    if (sel.isCollapsed) {
      window.setTimeout(() => {
        applyingSizeRef.current = false;
      }, 250);
      return;
    }

    const range = sel.getRangeAt(0);
    try {
      const sized = applySizeToRange(range, size);
      if (sized) {
        sel.removeAllRanges();
        sel.addRange(sized);
        savedRangeRef.current = sized.cloneRange();
      } else {
        savedRangeRef.current = cloneUsableEditorRange(sel.getRangeAt(0));
      }
    } catch {
      window.setTimeout(() => {
        applyingSizeRef.current = false;
      }, 250);
      return;
    }

    handleInput();
    window.setTimeout(() => {
      applyingSizeRef.current = false;
    }, 250);
  };

  const bumpFontSize = (delta: number) => {
    // Step by 2 to match the even size scale.
    applyFontSize(fontSizeRef.current + delta * 2);
  };

  const commitSizeDraft = () => {
    if (applyingSizeRef.current) return;
    const parsed = Number.parseInt(sizeDraftRef.current.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setSizeDraft(String(fontSizeRef.current));
      return;
    }
    applyFontSize(parsed);
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Prefer insertText so newlines stay as line breaks (HTML paste was flattening).
    if (plain && document.queryCommandSupported?.('insertText')) {
      document.execCommand('insertText', false, plain);
    } else if (plain) {
      const el = editorRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        el.insertAdjacentHTML('beforeend', noteTextToEditableHtml(plain));
      } else {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const temp = document.createElement('div');
        temp.innerHTML = noteTextToEditableHtml(plain);
        const frag = document.createDocumentFragment();
        while (temp.firstChild) frag.appendChild(temp.firstChild);
        range.insertNode(frag);
        sel.collapseToEnd();
      }
    }
    handleInput();
  };

  const onEditorKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleBold();
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    (
      <div
        ref={panelRef}
        style={{
          ...styles.panel,
          width: panelSize.w,
          height: panelSize.h,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 48px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <CornerResizeHandles onResizeStart={onResizeStart} />
        <div style={styles.header}>
          <span style={styles.headerTitle}>{title}</span>
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              handleClose();
            }}
            style={styles.doneBtn}
          >
            Done
          </button>
        </div>
        <div style={styles.tabRow} role="tablist" aria-label="Note tabs">
          {tabs.length > 1
            ? tabs.map(tab => {
                const active = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => selectTab(tab.id)}
                    style={{
                      ...styles.tabChip,
                      ...styles.tabBtn,
                      ...(active ? styles.tabChipActive : {}),
                      ...(active ? styles.tabBtnActive : {}),
                    }}
                  >
                    {tab.title}
                  </button>
                );
              })
            : null}
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={addTab}
            disabled={tabs.length >= NOTE_TABS_MAX}
            style={{
              ...styles.tabAddBtn,
              ...(tabs.length >= NOTE_TABS_MAX ? styles.tabAddBtnDisabled : {}),
            }}
            title={
              tabs.length >= NOTE_TABS_MAX ? `Maximum ${NOTE_TABS_MAX} tabs` : 'New tab'
            }
            aria-label="New tab"
          >
            +
          </button>
        </div>
        <div
          style={styles.toolbar}
          onMouseDown={e => {
            // Snapshot any live highlight before focus moves to toolbar chrome.
            saveSelectionFromEditor();
            // Preserve the editor highlight for buttons/menu; allow the size input to focus.
            if ((e.target as HTMLElement).closest('input')) return;
            e.preventDefault();
          }}
        >
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              toggleBold();
            }}
            style={{
              ...styles.toolBtn,
              ...(boldActive ? styles.toolBtnActive : {}),
              fontWeight: 700,
            }}
            title="Bold (⌘B)"
            aria-label="Bold"
            aria-pressed={boldActive}
          >
            B
          </button>
          <div style={styles.sizeControls} role="group" aria-label="Font size">
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
                saveSelectionFromEditor();
                armIgnoreToolbarClicks();
                bumpFontSize(-1);
              }}
              disabled={fontSize <= NOTE_FONT_SIZE_MIN}
              style={{
                ...styles.toolBtn,
                ...(fontSize <= NOTE_FONT_SIZE_MIN ? styles.toolBtnDisabled : {}),
              }}
              title="Smaller text"
              aria-label="Smaller text"
            >
              −
            </button>
            <div ref={sizeWrapRef} style={styles.sizeCombobox}>
              <input
                type="text"
                inputMode="numeric"
                value={sizeDraft}
                onChange={e => {
                  // Draft only — apply on Enter (or blur commit), not while typing.
                  setSizeDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 2));
                }}
                onMouseDown={e => {
                  // Snapshot highlight before the input steals focus and clears the live selection.
                  saveSelectionFromEditor();
                  e.stopPropagation();
                }}
                onFocus={() => setSizeMenuOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (applyingSizeRef.current) return;
                    if (!sizeWrapRef.current?.contains(document.activeElement)) {
                      setSizeMenuOpen(false);
                      commitSizeDraft();
                    }
                  }, 150);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSizeDraft();
                    setSizeMenuOpen(false);
                    (e.currentTarget as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    setSizeMenuOpen(false);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSizeMenuOpen(true);
                  }
                }}
                style={styles.sizeInput}
                title="Font size (8–24)"
                aria-label="Font size"
                aria-expanded={sizeMenuOpen}
                aria-haspopup="listbox"
              />
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  saveSelectionFromEditor();
                  setSizeMenuOpen(open => !open);
                }}
                style={styles.sizeChevronBtn}
                aria-label="Show font sizes"
              >
                ▾
              </button>
              {sizeMenuOpen ? (
                <div
                  style={styles.sizeMenu}
                  role="listbox"
                  aria-label="Font sizes"
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    saveSelectionFromEditor();
                  }}
                >
                  {NOTE_FONT_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={size === fontSize}
                      onMouseDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        saveSelectionFromEditor();
                        armIgnoreToolbarClicks();
                        applyFontSize(size);
                        setSizeMenuOpen(false);
                      }}
                      style={{
                        ...styles.sizeMenuItem,
                        ...(size === fontSize ? styles.sizeMenuItemActive : {}),
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
                saveSelectionFromEditor();
                armIgnoreToolbarClicks();
                bumpFontSize(1);
              }}
              disabled={fontSize >= NOTE_FONT_SIZE_MAX}
              style={{
                ...styles.toolBtn,
                ...(fontSize >= NOTE_FONT_SIZE_MAX ? styles.toolBtnDisabled : {}),
              }}
              title="Larger text"
              aria-label="Larger text"
            >
              +
            </button>
          </div>
          {tabs.length > 1 && activeTabId !== tabs[0]?.id ? (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                closeTab(activeTabId);
              }}
              style={styles.tabCloseToolbarBtn}
              title="Close tab"
              aria-label="Close current tab"
            >
              ×
            </button>
          ) : null}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={onEditorKeyDown}
          onPointerDown={e => {
            if (e.button !== 0) return;
            const editor = editorRef.current;
            if (!editor) return;
            const caret = caretFromPoint(e.clientX, e.clientY);
            if (!caret || !editor.contains(caret.node)) {
              dragSelectRef.current = null;
              return;
            }
            dragSelectRef.current = {
              anchorNode: caret.node,
              anchorOffset: caret.offset,
              lastInBoundsY: e.clientY,
            };
          }}
          onMouseUp={syncToolbarFromEditorSelection}
          onKeyUp={syncToolbarFromEditorSelection}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
            syncDraftFromEditor();
            scheduleCommit();
          }}
          data-placeholder="Start typing…"
          style={{
            ...styles.editor,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }}
        />
      </div>
    ),
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10001,
    background: '#fff',
    borderRadius: 12,
    // visible so the size menu / resize handles aren't clipped
    overflow: 'visible',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
    boxSizing: 'border-box',
    transition: 'none',
    animation: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    background: '#fff',
    flexShrink: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  doneBtn: {
    border: 'none',
    background: 'transparent',
    color: '#6366f1',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: '4px 0',
    flexShrink: 0,
  },
  tabRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderBottom: '1px solid #f1f5f9',
    background: '#fff',
    flexShrink: 0,
    overflowX: 'auto',
  },
  tabChip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#f8fafc',
    flexShrink: 0,
  },
  tabChipActive: {
    background: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  tabBtn: {
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: '6px 14px',
    lineHeight: 1.2,
    textAlign: 'center',
  },
  tabBtnActive: {
    color: '#3730a3',
    background: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  tabCloseToolbarBtn: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#64748b',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: font,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
  },
  tabAddBtn: {
    width: 26,
    height: 26,
    border: '1px dashed #cbd5e1',
    borderRadius: 6,
    background: '#fff',
    color: '#475569',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
  },
  tabAddBtnDisabled: {
    opacity: 0.35,
    cursor: 'default',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    background: '#f8fafc',
    flexShrink: 0,
    overflow: 'visible',
    position: 'relative',
    zIndex: 3,
  },
  toolBtn: {
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#0f172a',
    fontSize: 13,
    fontFamily: font,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  toolBtnActive: {
    background: '#e0e7ff',
    borderColor: '#c7d2fe',
    color: '#3730a3',
  },
  sizeControls: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  sizeCombobox: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  sizeInput: {
    width: 44,
    height: 28,
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#0f172a',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    textAlign: 'center',
    padding: '0 18px 0 4px',
    outline: 'none',
    fontVariantNumeric: 'tabular-nums',
  },
  sizeChevronBtn: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 16,
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 10,
    lineHeight: 1,
    padding: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 20,
    minWidth: 52,
    maxHeight: 220,
    overflowY: 'auto',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
    padding: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  sizeMenuItem: {
    border: 'none',
    background: 'transparent',
    borderRadius: 5,
    padding: '5px 8px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    color: '#0f172a',
    textAlign: 'center',
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
  },
  sizeMenuItemActive: {
    background: '#e2e8f0',
  },
  toolBtnDisabled: {
    opacity: 0.35,
    cursor: 'default',
  },
  editor: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    padding: 16,
    border: 'none',
    outline: 'none',
    overflowY: 'auto',
    background: '#fff',
    color: '#0f172a',
    fontFamily: font,
    fontSize: 14,
    lineHeight: 1.6,
    boxSizing: 'border-box',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
