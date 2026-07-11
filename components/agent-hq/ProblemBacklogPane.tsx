'use client';

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ProjectWorkspace } from './types';

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function byUpdatedDesc(a: ProjectWorkspace, b: ProjectWorkspace) {
  return b.updatedAt - a.updatedAt;
}

export default function ProblemBacklogPane() {
  const [problemsNote, setProblemsNote] = useLocalStorage<string>('agentHQ_problemsNote', '');
  const [projects, setProjects] = useLocalStorage<ProjectWorkspace[]>('agentHQ_projectWorkspaces', []);
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('agentHQ_activeProjectId', null);
  const [targetProjectId, setTargetProjectId] = useState<string>(activeProjectId ?? '');
  const [bubble, setBubble] = useState<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sortedProjects = useMemo(() => [...projects].sort(byUpdatedDesc), [projects]);
  function updateSelectionBubble() {
    const el = textareaRef.current;
    if (!el) return;
    const from = Math.min(el.selectionStart, el.selectionEnd);
    const to = Math.max(el.selectionStart, el.selectionEnd);
    const picked = problemsNote.slice(from, to).trim();
    if (!picked) {
      setBubble(null);
      return;
    }
    const box = el.getBoundingClientRect();
    const relativeTop = 12 + (el.value.slice(0, to).split('\n').length - 1) * 24 - el.scrollTop;
    const x = Math.max(8, Math.min(box.width - 230, 14));
    const y = Math.max(8, Math.min(box.height - 56, relativeTop));
    setBubble({ x, y });
  }

  function addSelectionToProject() {
    const pid = targetProjectId || activeProjectId;
    if (!pid) {
      alert('Pick a project first.');
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    const from = Math.min(el.selectionStart, el.selectionEnd);
    const to = Math.max(el.selectionStart, el.selectionEnd);
    const picked = problemsNote.slice(from, to).trim();
    if (!picked) {
      alert('Highlight one or more problem lines first.');
      return;
    }
    setProjects(prev =>
      prev.map(p =>
        p.id !== pid
          ? p
          : {
              ...p,
              updatedAt: Date.now(),
              notes: p.notes ? `${p.notes}\n${picked}` : picked,
            }
      )
    );
    setActiveProjectId(pid);
    setBubble(null);
    el.focus();
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.editorWrap}>
        <textarea
          ref={textareaRef}
          value={problemsNote}
          onChange={e => setProblemsNote(e.target.value)}
          onMouseUp={updateSelectionBubble}
          onKeyUp={updateSelectionBubble}
          onSelect={updateSelectionBubble}
          onBlur={() => setTimeout(() => setBubble(prev => prev), 100)}
          placeholder="Dump all problems here. Highlight text, then add to project."
          style={styles.noteArea}
        />
        {bubble && (
          <div style={{ ...styles.bubble, left: bubble.x, top: bubble.y }}>
            <select value={targetProjectId} onChange={e => setTargetProjectId(e.target.value)} style={styles.select}>
              <option value="">Use active project</option>
              {sortedProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={addSelectionToProject} style={styles.btn}>
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' },
  editorWrap: { position: 'relative', display: 'flex', flex: 1, minHeight: 0 },
  noteArea: {
    width: '100%',
    flex: 1,
    minHeight: 'min(40vh, 360px)',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    padding: '14px 16px',
    fontSize: 15,
    lineHeight: 1.55,
    fontFamily: font,
    color: '#0f172a',
    boxSizing: 'border-box',
  },
  bubble: {
    position: 'absolute',
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
    padding: 6,
    zIndex: 30,
    maxWidth: 240,
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 12,
    fontFamily: font,
    color: '#334155',
    background: '#fff',
    flex: 1,
    minWidth: 120,
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
    flexShrink: 0,
  },
};
