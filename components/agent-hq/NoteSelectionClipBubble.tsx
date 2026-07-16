'use client';

import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
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

function selectionBubblePosition(el: HTMLTextAreaElement): { left: number; top: number } | null {
  const { picked } = readSelection(el);
  if (!picked) return null;

  const style = getComputedStyle(el);
  const lineHeight = Number.parseFloat(style.lineHeight) || (Number.parseFloat(style.fontSize) || 14) * 1.6;
  const paddingTop = Number.parseFloat(style.paddingTop) || 16;
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 16;
  const linesBefore = el.value.slice(0, Math.max(el.selectionStart, el.selectionEnd)).split('\n').length;
  const relativeTop = paddingTop + (linesBefore - 1) * lineHeight - el.scrollTop;
  const rect = el.getBoundingClientRect();

  const left = Math.max(12, Math.min(window.innerWidth - 272, rect.left + paddingLeft));
  const top = Math.max(12, Math.min(window.innerHeight - 160, rect.top + relativeTop));

  return { left, top };
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

  const [bubble, setBubble] = useState<{ left: number; top: number } | null>(null);
  const [projectId, setProjectId] = useState('');
  const [sectionKey, setSectionKey] = useState('project');

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

  const updateBubble = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      setBubble(null);
      return;
    }
    setBubble(selectionBubblePosition(el));
  }, [textareaRef]);

  const hideBubbleIfNeeded = useCallback(() => {
    window.setTimeout(() => {
      const active = document.activeElement;
      const el = textareaRef.current;
      if (active === el) return;
      if (active?.closest('[data-note-clip-bubble]')) return;
      setBubble(null);
    }, 0);
  }, [textareaRef]);

  const addSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el || !selectedProject) return;

    const { from, to, picked } = readSelection(el);
    if (!picked) return;

    const section = sectionOptions.find(o => o.key === activeSectionKey);
    if (!section) return;

    const entry = formatNoteClipEntry(sourceLabel, noteText.slice(from, to));
    setProjects(prev => applyNoteClip(prev, section.target, entry));
    setBubble(null);
    el.focus();
  }, [
    activeSectionKey,
    noteText,
    sectionOptions,
    selectedProject,
    setProjects,
    sourceLabel,
    textareaRef,
  ]);

  useEffect(() => {
    if (!bubble) return;
    const onScroll = () => updateBubble();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [bubble, updateBubble]);

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
      }
    },
    onBlur: hideBubbleIfNeeded,
  };

  const bubbleNode =
    bubble && typeof document !== 'undefined'
      ? createPortal(
          <div
            data-note-clip-bubble
            style={{ ...styles.bubble, left: bubble.left, top: bubble.top }}
            onMouseDown={e => e.preventDefault()}
          >
            <div style={styles.bubbleTitle}>Add to project</div>
            {hasProjects ? (
              <>
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
                <button type="button" onClick={addSelection} style={styles.btn}>
                  Add
                </button>
              </>
            ) : (
              <p style={styles.emptyHint}>Create a project in the Projects card first.</p>
            )}
          </div>,
          document.body
        )
      : null;

  return { textareaHandlers, bubbleNode };
}

const styles: Record<string, CSSProperties> = {
  bubble: {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
    padding: 8,
    zIndex: 10050,
    width: 256,
  },
  bubbleTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    fontFamily: font,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 12,
    fontFamily: font,
    color: '#334155',
    background: '#fff',
    width: '100%',
  },
  btn: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '7px 10px',
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
