'use client';

import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react';
import type { AppleNote } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const DAY = 86400000;

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function firstLine(text: string): string {
  const line = text.split(/\r?\n/)[0]?.trim() ?? '';
  if (!line) return 'New Note';
  return line.length > 72 ? line.slice(0, 69) + '…' : line;
}

function bodyPreview(text: string): string {
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

function formatNoteTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

type GroupKey = 'today' | 'prev30' | 'older';

function groupNotes(notes: AppleNote[]): { key: GroupKey; label: string; items: AppleNote[] }[] {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const t0 = startToday.getTime();
  const t30 = t0 - 30 * DAY;

  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const today: AppleNote[] = [];
  const prev30: AppleNote[] = [];
  const older: AppleNote[] = [];

  for (const n of sorted) {
    if (n.updatedAt >= t0) today.push(n);
    else if (n.updatedAt >= t30) prev30.push(n);
    else older.push(n);
  }

  const out: { key: GroupKey; label: string; items: AppleNote[] }[] = [];
  if (today.length) out.push({ key: 'today', label: 'Today', items: today });
  if (prev30.length) out.push({ key: 'prev30', label: 'Previous 30 Days', items: prev30 });
  if (older.length) out.push({ key: 'older', label: 'Older', items: older });
  return out;
}

export default function AppleNotesPanel() {
  const [notes, setNotes] = useLocalStorage<AppleNote[]>('agentHQ_appleNotes', []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'gallery'>('list');
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    if (migrated) return;
    setMigrated(true);
    try {
      const legacy = localStorage.getItem('agentHQ_notes');
      if (legacy?.trim() && notes.length === 0) {
        const n: AppleNote = {
          id: makeId(),
          content: legacy.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setNotes([n]);
        setSelectedId(n.id);
        localStorage.removeItem('agentHQ_notes');
      }
    } catch {
      /* ignore */
    }
  }, [migrated, notes.length, setNotes]);

  useEffect(() => {
    if (notes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !notes.some(n => n.id === selectedId)) {
      setSelectedId(notes.sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
    }
  }, [notes, selectedId]);

  const selected = useMemo(() => notes.find(n => n.id === selectedId) ?? null, [notes, selectedId]);

  const groups = useMemo(() => groupNotes(notes), [notes]);

  const updateSelectedContent = useCallback(
    (content: string) => {
      if (!selectedId) return;
      const now = Date.now();
      setNotes(prev => prev.map(n => (n.id === selectedId ? { ...n, content, updatedAt: now } : n)));
    },
    [selectedId, setNotes]
  );

  const addNote = useCallback(() => {
    const n: AppleNote = {
      id: makeId(),
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes(prev => [n, ...prev]);
    setSelectedId(n.id);
  }, [setNotes]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    if (!confirm('Delete this note?')) return;
    setNotes(prev => prev.filter(n => n.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, setNotes]);

  const sidebarBg = '#fff';
  const editorBg = '#fff';
  const accentSelect = '#eef2ff';
  const accentBorder = '#6366f1';
  const borderSub = '#e2e8f0';
  const borderLight = '#f1f5f9';
  const textPrimary = '#0f172a';
  const textSecondary = '#64748b';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: 400,
        borderRadius: '0 0 10px 10px',
        overflow: 'hidden',
        fontFamily: font,
        borderTop: `1px solid ${borderSub}`,
        background: editorBg,
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 'min(100%, 300px)',
          minWidth: 260,
          flexShrink: 0,
          background: sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${borderSub}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 10px',
            borderBottom: `1px solid ${borderSub}`,
          }}
        >
          <ToolbarBtn
            label="List"
            active={view === 'list'}
            onClick={() => setView('list')}
            icon="☰"
            theme="light"
          />
          <ToolbarBtn
            label="Gallery"
            active={view === 'gallery'}
            onClick={() => setView('gallery')}
            icon="▦"
            theme="light"
          />
          <div style={{ width: 1, height: 20, background: borderSub, margin: '0 4px' }} />
          <ToolbarBtn label="Delete" onClick={deleteSelected} icon="⌫" disabled={!selectedId} theme="light" />
          <div style={{ flex: 1 }} />
          <ToolbarBtn label="New note" onClick={addNote} icon="✎" primary theme="light" />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.length === 0 ? (
            <div style={{ padding: 20, color: textSecondary, fontSize: 13 }}>No notes yet. Click ✎ to create one.</div>
          ) : view === 'list' ? (
            groups.map(g => (
              <div key={g.key}>
                <div
                  style={{
                    padding: '10px 14px 6px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: textSecondary,
                    letterSpacing: 0.2,
                  }}
                >
                  {g.label}
                </div>
                {g.items.map(note => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    selected={note.id === selectedId}
                    onSelect={() => setSelectedId(note.id)}
                    accentSelect={accentSelect}
                    accentBorder={accentBorder}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                ))}
              </div>
            ))
          ) : (
            <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {notes
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(note => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    style={{
                      textAlign: 'left',
                      padding: 10,
                      borderRadius: 8,
                      border: `1px solid ${note.id === selectedId ? accentBorder : borderSub}`,
                      background: note.id === selectedId ? accentSelect : '#f8fafc',
                      color: textPrimary,
                      cursor: 'pointer',
                      fontFamily: font,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{firstLine(note.content)}</div>
                    <div style={{ fontSize: 11, color: textSecondary }}>
                      {formatNoteTime(note.updatedAt)} · {bodyPreview(note.content)}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, background: editorBg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            <div
              style={{
                padding: '8px 14px',
                borderBottom: `1px solid ${borderLight}`,
                color: textSecondary,
                fontSize: 11,
                background: '#fff',
              }}
            >
              {new Date(selected.updatedAt).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
            <textarea
              value={selected.content}
              onChange={e => updateSelectedContent(e.target.value)}
              placeholder="Start typing…"
              style={{
                flex: 1,
                width: '100%',
                minHeight: 280,
                padding: 16,
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: '#fff',
                color: textPrimary,
                fontFamily: font,
                fontSize: 14,
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
          </>
        ) : (
          <div style={{ padding: 24, color: textSecondary, fontSize: 14 }}>
            Select a note or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  active,
  disabled,
  primary,
  theme = 'dark',
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  primary?: boolean;
  theme?: 'dark' | 'light';
  onClick: () => void;
}) {
  const light = theme === 'light';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 34,
        height: 30,
        borderRadius: 6,
        border: light ? '1px solid #e2e8f0' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        background: active
          ? light
            ? '#eef2ff'
            : '#3a3a3c'
          : primary
            ? light
              ? '#6366f1'
              : '#48484a'
            : light
              ? '#fff'
              : 'transparent',
        color: primary && light ? '#fff' : light ? '#334155' : '#e8e8ed',
        fontSize: 14,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  );
}

function NoteRow({
  note,
  selected,
  onSelect,
  accentSelect,
  accentBorder,
  textPrimary,
  textSecondary,
}: {
  note: AppleNote;
  selected: boolean;
  onSelect: () => void;
  accentSelect: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const title = firstLine(note.content);
  const preview = bodyPreview(note.content);
  const time = formatNoteTime(note.updatedAt);

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 14px 12px',
        marginBottom: 2,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        background: selected ? accentSelect : 'transparent',
        boxShadow: selected ? `inset 0 0 0 1px ${accentBorder}` : 'none',
        display: 'block',
        fontFamily: font,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: textPrimary,
          marginBottom: 4,
          lineHeight: 1.25,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 11, color: selected ? textSecondary : textSecondary, marginBottom: 4, lineHeight: 1.35 }}>
        {preview ? `${time} · ${preview}` : time}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: textSecondary }}>
        <span style={{ opacity: 0.85 }} aria-hidden>
          📁
        </span>
        <span>Notes</span>
      </div>
    </button>
  );
}
