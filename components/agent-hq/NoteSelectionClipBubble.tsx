'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PROJECTS_STORAGE_KEY } from './stuckHelp/projectMutations';
import type { ProjectBoard } from './types';
import {
  applyNoteClip,
  formatNoteClipEntry,
  listNoteClipSections,
} from './noteClipUtils';

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const CHIP_SIZE = 20;

const MIRROR_PROPS = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
] as const;

type SetProjects = (
  value: ProjectBoard[] | ((prev: ProjectBoard[]) => ProjectBoard[])
) => void;

interface UseNoteClipBubbleOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  noteText: string;
  clipDateMs?: number;
  projects?: ProjectBoard[];
  setProjects?: SetProjects;
  /** PiP / secondary window — portal + coords must use this document */
  portalDocument?: Document | null;
}

function projectDisplayName(project: ProjectBoard): string {
  return project.name.trim() || 'Untitled project';
}

function byUpdatedDesc(a: ProjectBoard, b: ProjectBoard) {
  return b.updatedAt - a.updatedAt;
}

function readSelection(el: HTMLTextAreaElement) {
  const from = Math.min(el.selectionStart, el.selectionEnd);
  const to = Math.max(el.selectionStart, el.selectionEnd);
  return { from, to, picked: el.value.slice(from, to).trim() };
}

function getCaretViewportPoint(
  el: HTMLTextAreaElement,
  position: number,
  mountDoc: Document
): { left: number; top: number; lineHeight: number } {
  const computed = mountDoc.defaultView?.getComputedStyle(el) ?? getComputedStyle(el);
  const mirror = mountDoc.createElement('div');
  const style = mirror.style;

  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.overflow = 'hidden';

  for (const prop of MIRROR_PROPS) {
    style[prop] = computed[prop];
  }

  style.width = `${el.clientWidth}px`;

  const before = el.value.slice(0, position);
  mirror.textContent = before;

  const marker = mountDoc.createElement('span');
  marker.textContent = el.value.slice(position, position + 1) || '.';
  mirror.appendChild(marker);

  mountDoc.body.appendChild(mirror);

  const textareaRect = el.getBoundingClientRect();
  const lineHeight = marker.offsetHeight || Number.parseFloat(computed.lineHeight) || 20;
  const point = {
    left: textareaRect.left + marker.offsetLeft - el.scrollLeft,
    top: textareaRect.top + marker.offsetTop - el.scrollTop,
    lineHeight,
  };

  mountDoc.body.removeChild(mirror);
  return point;
}

function chipAnchor(
  el: HTMLTextAreaElement,
  from: number,
  to: number,
  mountDoc: Document
): { left: number; top: number } {
  const view = mountDoc.defaultView ?? window;
  const newlineAt = el.value.indexOf('\n', from);
  const firstLineEnd = newlineAt === -1 || newlineAt >= to ? to : newlineAt;

  const topLeft = getCaretViewportPoint(el, from, mountDoc);
  const topRight = getCaretViewportPoint(el, firstLineEnd, mountDoc);

  const gap = 4;
  let left = topRight.left + gap;
  let top = topLeft.top - CHIP_SIZE - gap;

  const maxLeft = view.innerWidth - CHIP_SIZE - 8;
  const maxTop = view.innerHeight - CHIP_SIZE - 8;

  if (top < 8) {
    top = topLeft.top + topLeft.lineHeight + gap;
  }

  return {
    left: Math.max(8, Math.min(maxLeft, left)),
    top: Math.max(8, Math.min(maxTop, top)),
  };
}

export function useNoteClipBubble({
  textareaRef,
  noteText,
  clipDateMs,
  projects: projectsProp,
  setProjects: setProjectsProp,
  portalDocument,
}: UseNoteClipBubbleOptions) {
  const [storedProjects, setStoredProjects] = useLocalStorage<ProjectBoard[]>(PROJECTS_STORAGE_KEY, []);
  const projects = projectsProp ?? storedProjects;
  const setProjects = setProjectsProp ?? setStoredProjects;

  const mountDoc =
    portalDocument ?? (typeof document !== 'undefined' ? document : null);
  const mountWin = mountDoc?.defaultView ?? (typeof window !== 'undefined' ? window : null);

  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [sectionKey, setSectionKey] = useState('project');
  const [addContext, setAddContext] = useState(false);
  const [contextText, setContextText] = useState('');
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;

  const sortedProjects = useMemo(() => [...projects].sort(byUpdatedDesc), [projects]);
  const hasProjects = sortedProjects.length > 0;

  const selectedProject = useMemo(
    () => sortedProjects.find(p => p.id === projectId) ?? sortedProjects[0] ?? null,
    [sortedProjects, projectId]
  );

  const sectionOptions = useMemo(
    () => (selectedProject ? listNoteClipSections(selectedProject) : []),
    [selectedProject]
  );

  const activeSectionKey = sectionOptions.some(o => o.key === sectionKey)
    ? sectionKey
    : sectionOptions[0]?.key ?? 'project';

  const clearClipUi = useCallback(() => {
    setAnchor(null);
    setExpanded(false);
    setAddContext(false);
    setContextText('');
    selectionRef.current = null;
  }, []);

  const updateBubble = useCallback(() => {
    const el = textareaRef.current;
    if (!el || !mountDoc) {
      if (!expandedRef.current) clearClipUi();
      return;
    }

    const { from, to, picked } = readSelection(el);
    if (!picked) {
      if (!expandedRef.current) clearClipUi();
      return;
    }

    selectionRef.current = { from, to };
    setAnchor(chipAnchor(el, from, to, mountDoc));
  }, [clearClipUi, mountDoc, textareaRef]);

  const openExpanded = useCallback(() => {
    const el = textareaRef.current;
    const saved = selectionRef.current;
    if (el && saved) {
      el.focus();
      el.setSelectionRange(saved.from, saved.to);
      if (mountDoc) setAnchor(chipAnchor(el, saved.from, saved.to, mountDoc));
    }
    setExpanded(true);
  }, [mountDoc, textareaRef]);

  const addSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el || !selectedProject) return;

    const saved = selectionRef.current;
    const from = saved?.from ?? Math.min(el.selectionStart, el.selectionEnd);
    const to = saved?.to ?? Math.max(el.selectionStart, el.selectionEnd);
    const picked = noteText.slice(from, to).trim();
    if (!picked) return;

    const section = sectionOptions.find(o => o.key === activeSectionKey);
    if (!section) return;

    const entry = formatNoteClipEntry({
      text: picked,
      dateMs: clipDateMs,
      context: addContext ? contextText : undefined,
    });
    setProjects(prev => applyNoteClip(prev, section.target, entry));
    clearClipUi();
    el.focus();
  }, [
    activeSectionKey,
    addContext,
    clearClipUi,
    clipDateMs,
    contextText,
    noteText,
    sectionOptions,
    selectedProject,
    setProjects,
    textareaRef,
  ]);

  useEffect(() => {
    if (!anchor || !mountWin) return;
    const onReposition = () => updateBubble();
    mountWin.addEventListener('scroll', onReposition, true);
    mountWin.addEventListener('resize', onReposition);
    return () => {
      mountWin.removeEventListener('scroll', onReposition, true);
      mountWin.removeEventListener('resize', onReposition);
    };
  }, [anchor, mountWin, updateBubble]);

  useEffect(() => {
    if (!expanded || !mountDoc) return;

    const onDocDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-note-clip-ui]')) return;
      setExpanded(false);
    };

    // Defer so the same click that opened the panel does not instantly close it.
    const timer = window.setTimeout(() => {
      mountDoc.addEventListener('mousedown', onDocDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      mountDoc.removeEventListener('mousedown', onDocDown);
    };
  }, [expanded, mountDoc]);

  const textareaHandlers = {
    onPointerUp: updateBubble,
    onMouseUp: updateBubble,
    onKeyUp: updateBubble,
    onSelect: updateBubble,
    onContextMenu: (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const el = textareaRef.current;
      if (!el) return;
      const { from, to, picked } = readSelection(el);
      if (!picked) return;
      e.preventDefault();
      selectionRef.current = { from, to };
      if (mountDoc) setAnchor(chipAnchor(el, from, to, mountDoc));
      setExpanded(true);
    },
  };

  const panelLeft = anchor && mountWin
    ? Math.min(anchor.left, mountWin.innerWidth - 260)
    : 0;
  const panelTop = anchor ? anchor.top + CHIP_SIZE + 6 : 0;

  const bubbleNode =
    anchor && mountDoc?.body
      ? createPortal(
          <div data-note-clip-ui>
            {!expanded ? (
              <button
                type="button"
                title="Add to project"
                aria-label="Add selection to project"
                data-note-clip-ui
                style={{ ...styles.chip, left: anchor.left, top: anchor.top }}
                onPointerDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={e => {
                  e.stopPropagation();
                  openExpanded();
                }}
              >
                <span style={styles.chipIcon} aria-hidden>
                  +
                </span>
              </button>
            ) : (
              <div
                data-note-clip-ui
                style={{ ...styles.panel, left: panelLeft, top: panelTop }}
              >
                <div style={styles.panelHeader}>
                  <span style={styles.panelTitle}>Add to</span>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    style={styles.closeBtn}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                {hasProjects ? (
                  <>
                    <label style={styles.fieldLabel}>
                      Project
                      <select
                        value={selectedProject?.id ?? ''}
                        onChange={e => {
                          setProjectId(e.target.value);
                          setSectionKey('project');
                        }}
                        style={styles.select}
                      >
                        {sortedProjects.map(project => (
                          <option key={project.id} value={project.id}>
                            {projectDisplayName(project)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={styles.fieldLabel}>
                      Section
                      <select
                        value={activeSectionKey}
                        onChange={e => setSectionKey(e.target.value)}
                        style={styles.select}
                      >
                        {sectionOptions.map(option => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={addContext}
                        onChange={e => setAddContext(e.target.checked)}
                      />
                      Add context
                    </label>
                    {addContext ? (
                      <input
                        type="text"
                        value={contextText}
                        onChange={e => setContextText(e.target.value)}
                        placeholder="Short label for this clip"
                        style={styles.textInput}
                      />
                    ) : null}
                    <button type="button" onClick={addSelection} style={styles.btn}>
                      Add
                    </button>
                  </>
                ) : (
                  <p style={styles.emptyHint}>Create a project in the Projects card first.</p>
                )}
              </div>
            )}
          </div>,
          mountDoc.body
        )
      : null;

  return { textareaHandlers, bubbleNode };
}

const styles: Record<string, CSSProperties> = {
  chip: {
    position: 'fixed',
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#0f172a',
    color: '#fff',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
    zIndex: 10050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  chipIcon: {
    display: 'block',
    transform: 'translateY(-1px)',
  },
  panel: {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
    padding: 10,
    zIndex: 10050,
    width: 248,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#0f172a',
    fontFamily: font,
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    width: 20,
    height: 20,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    fontFamily: font,
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '7px 8px',
    fontSize: 12,
    fontWeight: 400,
    fontFamily: font,
    color: '#334155',
    background: '#fff',
    width: '100%',
    cursor: 'pointer',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 500,
    color: '#334155',
    fontFamily: font,
    cursor: 'pointer',
  },
  textInput: {
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '7px 8px',
    fontSize: 12,
    fontFamily: font,
    color: '#334155',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  btn: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  emptyHint: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
    color: '#64748b',
    fontFamily: font,
  },
};
