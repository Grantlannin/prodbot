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

type SetProjects = (
  value: ProjectBoard[] | ((prev: ProjectBoard[]) => ProjectBoard[])
) => void;

interface UseNoteClipBubbleOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  noteText: string;
  sourceLabel: string;
  projects?: ProjectBoard[];
  setProjects?: SetProjects;
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

function chipAnchor(el: HTMLTextAreaElement): { left: number; top: number } | null {
  const { picked } = readSelection(el);
  if (!picked) return null;

  const rect = el.getBoundingClientRect();
  const chipSize = 26;
  const inset = 10;

  return {
    left: rect.right - chipSize - inset,
    top: rect.top + inset,
  };
}

export function useNoteClipBubble({
  textareaRef,
  noteText,
  sourceLabel,
  projects: projectsProp,
  setProjects: setProjectsProp,
}: UseNoteClipBubbleOptions) {
  const [storedProjects, setStoredProjects] = useLocalStorage<ProjectBoard[]>(PROJECTS_STORAGE_KEY, []);
  const projects = projectsProp ?? storedProjects;
  const setProjects = setProjectsProp ?? setStoredProjects;

  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [sectionKey, setSectionKey] = useState('project');
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

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
    selectionRef.current = null;
  }, []);

  const updateBubble = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      clearClipUi();
      return;
    }

    const { from, to, picked } = readSelection(el);
    if (!picked) {
      clearClipUi();
      return;
    }

    selectionRef.current = { from, to };
    setAnchor(chipAnchor(el));
  }, [clearClipUi, textareaRef]);

  const openExpanded = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      const { from, to, picked } = readSelection(el);
      if (picked) selectionRef.current = { from, to };
    }
    setExpanded(true);
  }, [textareaRef]);

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

    const entry = formatNoteClipEntry(sourceLabel, picked);
    setProjects(prev => applyNoteClip(prev, section.target, entry));
    clearClipUi();
    el.focus();
  }, [
    activeSectionKey,
    clearClipUi,
    noteText,
    sectionOptions,
    selectedProject,
    setProjects,
    sourceLabel,
    textareaRef,
  ]);

  useEffect(() => {
    if (!anchor) return;
    const onScroll = () => updateBubble();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [anchor, updateBubble]);

  useEffect(() => {
    if (!expanded) return;
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-note-clip-ui]')) return;
      setExpanded(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [expanded]);

  const textareaHandlers = {
    onPointerUp: updateBubble,
    onMouseUp: updateBubble,
    onKeyUp: updateBubble,
    onSelect: updateBubble,
    onContextMenu: (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const el = textareaRef.current;
      if (!el) return;
      if (readSelection(el).picked) {
        e.preventDefault();
        updateBubble();
        openExpanded();
      }
    },
  };

  const panelLeft = anchor ? Math.min(anchor.left, window.innerWidth - 268) : 0;
  const panelTop = anchor ? anchor.top + 32 : 0;

  const bubbleNode =
    anchor && typeof document !== 'undefined'
      ? createPortal(
          <div data-note-clip-ui>
            {!expanded ? (
              <button
                type="button"
                title="Add to project"
                aria-label="Add selection to project"
                style={{ ...styles.chip, left: anchor.left, top: anchor.top }}
                onMouseDown={e => {
                  e.preventDefault();
                  openExpanded();
                }}
              >
                +
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
          document.body
        )
      : null;

  return { textareaHandlers, bubbleNode };
}

const styles: Record<string, CSSProperties> = {
  chip: {
    position: 'fixed',
    width: 26,
    height: 26,
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#0f172a',
    color: '#fff',
    fontSize: 16,
    lineHeight: 1,
    fontWeight: 500,
    fontFamily: font,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
    zIndex: 10050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
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
