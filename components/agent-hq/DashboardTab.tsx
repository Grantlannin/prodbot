'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { BigGoal, Project, OpenLoop, WorkStatus, WorkSession } from './types';
import AppleNotesPanel from './AppleNotesPanel';
import { useLocalStorage } from './hooks/useLocalStorage';

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const MONTH_ALIASES: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const MONTH_NAMES_SORTED = Object.keys(MONTH_ALIASES).sort((a, b) => b.length - a.length);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripOrdinals(s: string) {
  return s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
}

/** Parses month/day style text into a calendar date (local midnight). */
function parseFlexibleDeadline(raw: string, ref = new Date()): Date | null {
  const s = stripOrdinals(raw.trim()).replace(/\s+/g, ' ');
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const mo = parseInt(iso[2], 10) - 1;
    const day = parseInt(iso[3], 10);
    if (mo < 0 || mo > 11 || day < 1 || day > 31) return null;
    const d = new Date(y, mo, day);
    return d.getMonth() === mo && d.getDate() === day ? d : null;
  }

  const slash = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (slash) {
    const mo = parseInt(slash[1], 10) - 1;
    const day = parseInt(slash[2], 10);
    let year: number;
    if (slash[3]) {
      const yv = parseInt(slash[3], 10);
      year = slash[3].length === 2 ? 2000 + yv : yv;
    } else {
      year = ref.getFullYear();
    }
    const d = new Date(year, mo, day);
    if (d.getMonth() !== mo || d.getDate() !== day) return null;
    if (!slash[3]) {
      while (startOfLocalDay(d) < startOfLocalDay(ref)) {
        d.setFullYear(d.getFullYear() + 1);
      }
    }
    return d;
  }

  const lower = s.toLowerCase();
  for (const name of MONTH_NAMES_SORTED) {
    const mo = MONTH_ALIASES[name];
    const re = new RegExp(`^${escapeRe(name)}\\s+(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?\\s*$`, 'i');
    const m = lower.match(re);
    if (m) {
      const day = parseInt(m[1], 10);
      const year = m[2] ? parseInt(m[2], 10) : ref.getFullYear();
      const d = new Date(year, mo, day);
      if (d.getMonth() !== mo || d.getDate() !== day) return null;
      if (!m[2]) {
        while (startOfLocalDay(d) < startOfLocalDay(ref)) {
          d.setFullYear(d.getFullYear() + 1);
        }
      }
      return d;
    }
  }

  for (const name of MONTH_NAMES_SORTED) {
    const mo = MONTH_ALIASES[name];
    const re = new RegExp(`^(\\d{1,2})\\s+${escapeRe(name)}(?:\\s*,?\\s*(\\d{4}))?\\s*$`, 'i');
    const m = lower.match(re);
    if (m) {
      const day = parseInt(m[1], 10);
      const year = m[2] ? parseInt(m[2], 10) : ref.getFullYear();
      const d = new Date(year, mo, day);
      if (d.getMonth() !== mo || d.getDate() !== day) return null;
      if (!m[2]) {
        while (startOfLocalDay(d) < startOfLocalDay(ref)) {
          d.setFullYear(d.getFullYear() + 1);
        }
      }
      return d;
    }
  }

  const y0 = ref.getFullYear();
  for (const y of [y0, y0 + 1]) {
    const t = Date.parse(`${s}, ${y}`);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      if (d.getFullYear() === y) return d;
    }
  }
  return null;
}

function daysFromTodayTo(deadline: Date, ref = new Date()): number {
  return Math.round((startOfLocalDay(deadline) - startOfLocalDay(ref)) / 86400000);
}

function deadlineHint(text: string | undefined, completed: boolean): { line: string; tone: 'ok' | 'soon' | 'bad' | 'muted' } {
  if (!text?.trim() || completed) return { line: '', tone: 'muted' };
  const d = parseFlexibleDeadline(text);
  if (!d) return { line: "Can't read that date", tone: 'bad' };
  const n = daysFromTodayTo(d);
  if (n === 0) return { line: 'Due today', tone: 'soon' };
  if (n === 1) return { line: '1 day away', tone: 'ok' };
  if (n > 1) return { line: `${n} days away`, tone: n <= 7 ? 'soon' : 'ok' };
  if (n === -1) return { line: '1 day overdue', tone: 'bad' };
  return { line: `${-n} days overdue`, tone: 'bad' };
}

function isGoalOverdue(text: string | undefined, completed: boolean): boolean {
  if (!text?.trim() || completed) return false;
  const d = parseFlexibleDeadline(text);
  if (!d) return false;
  return daysFromTodayTo(d) < 0;
}

function hintColor(tone: 'ok' | 'soon' | 'bad' | 'muted') {
  if (tone === 'bad') return '#b45309';
  if (tone === 'soon') return '#a16207';
  return '#64748b';
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  if (m > 0) return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  return `${s}s`;
}

interface DashboardTabProps {
  workStatus: WorkStatus;
  currentSession: WorkSession | null;
  getTotals: (includeRunning?: boolean) => { workMs: number; breakMs: number };
}

export default function DashboardTab({ workStatus, currentSession, getTotals }: DashboardTabProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { workMs, breakMs } = getTotals(true);

  const [bigGoals, setBigGoals] = useLocalStorage<BigGoal[]>('agentHQ_bigGoals', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('agentHQ_projects', []);
  const [openLoops, setOpenLoops] = useLocalStorage<OpenLoop[]>('agentHQ_openLoops', []);

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');

  const [addingProject, setAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', status: 'active' as Project['status'] });

  const [showLoopModal, setShowLoopModal] = useState(false);
  const [loopStep, setLoopStep] = useState<1 | 2>(1);
  const [loopReq, setLoopReq] = useState('');
  const [loopAction, setLoopAction] = useState('');
  const [loopTime, setLoopTime] = useState('');

  const statusColor =
    workStatus === 'working'
      ? '#15803d'
      : workStatus === 'on_break'
        ? '#b45309'
        : workStatus === 'done'
          ? '#1d4ed8'
          : '#64748b';

  const statusLabel =
    workStatus === 'working'
      ? 'Working'
      : workStatus === 'on_break'
        ? 'On break'
        : workStatus === 'done'
          ? 'Done for now'
          : 'Idle';

  function DeadlineCell({
    value,
    completed,
    onChange,
  }: {
    value: string | undefined;
    completed: boolean;
    onChange: (v: string) => void;
  }) {
    const h = deadlineHint(value, completed);
    return (
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="April 30th"
          title="Type a month and day"
          style={{
            ...styles.goalDateInput,
            borderColor: isGoalOverdue(value, completed) ? '#f59e0b' : '#cbd5e1',
          }}
        />
        {h.line ? (
          <span style={{ fontSize: 12, fontWeight: 500, color: hintColor(h.tone), fontFamily: font }}>{h.line}</span>
        ) : null}
      </div>
    );
  }

  function addGoal() {
    if (!newGoalText.trim()) return;
    const deadline = newGoalDeadline.trim();
    setBigGoals(prev => [
      ...prev,
      {
        id: makeId(),
        text: newGoalText.trim(),
        completed: false,
        createdAt: Date.now(),
        ...(deadline ? { deadline } : {}),
      },
    ]);
    setNewGoalText('');
    setNewGoalDeadline('');
    setAddingGoal(false);
  }

  function setGoalDeadline(id: string, deadline: string) {
    setBigGoals(prev =>
      prev.map(g => {
        if (g.id !== id) return g;
        const next = { ...g };
        if (!deadline) delete next.deadline;
        else next.deadline = deadline;
        return next;
      })
    );
  }

  function toggleGoal(id: string) {
    setBigGoals(prev => prev.map(g => (g.id === id ? { ...g, completed: !g.completed } : g)));
  }

  function commitGoalEdit(id: string) {
    if (editingGoalText.trim()) {
      setBigGoals(prev => prev.map(g => (g.id === id ? { ...g, text: editingGoalText.trim() } : g)));
    }
    setEditingGoalId(null);
  }

  function deleteGoal(id: string) {
    setBigGoals(prev => prev.filter(g => g.id !== id));
  }

  const statusCycle: Record<Project['status'], Project['status']> = {
    active: 'paused',
    paused: 'complete',
    complete: 'active',
  };

  function addProject() {
    if (!newProject.name.trim()) return;
    setProjects(prev => [
      ...prev,
      {
        id: makeId(),
        ...newProject,
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        createdAt: Date.now(),
      },
    ]);
    setNewProject({ name: '', description: '', status: 'active' });
    setAddingProject(false);
  }

  function cycleStatus(id: string) {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, status: statusCycle[p.status] } : p)));
  }

  function deleteProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  function submitLoop() {
    if (!loopReq.trim() || !loopAction.trim()) return;
    setOpenLoops(prev => [
      ...prev,
      {
        id: makeId(),
        requirement: loopReq.trim(),
        action: loopAction.trim(),
        scheduledTime: loopTime.trim(),
        resolved: false,
        createdAt: Date.now(),
      },
    ]);
    resetLoopModal();
  }

  function resetLoopModal() {
    setLoopReq('');
    setLoopAction('');
    setLoopTime('');
    setLoopStep(1);
    setShowLoopModal(false);
  }

  function toggleLoop(id: string) {
    setOpenLoops(prev => prev.map(l => (l.id === id ? { ...l, resolved: !l.resolved } : l)));
  }

  function deleteLoop(id: string) {
    setOpenLoops(prev => prev.filter(l => l.id !== id));
  }

  const projectNameStyle: CSSProperties = {
    color: '#0f172a',
    fontFamily: font,
    fontSize: 15,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', overflowY: 'auto', fontFamily: font }}>
      <div style={styles.timeBanner}>
        <div>
          <div style={styles.bannerLabel}>Work time today</div>
          <div style={{ color: '#0f172a', fontFamily: font, fontSize: 36, fontWeight: 700 }}>
            {formatDuration(workMs)}
          </div>
        </div>

        <div style={styles.divider} />

        <div>
          <div style={styles.bannerLabel}>Break</div>
          <div style={{ color: '#b45309', fontFamily: font, fontSize: 26, fontWeight: 700 }}>
            {formatDuration(breakMs)}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ color: statusColor, fontFamily: font, fontSize: 15, fontWeight: 600 }}>{statusLabel}</div>
          {workStatus === 'working' && currentSession && (
            <div style={{ color: '#64748b', fontFamily: font, fontSize: 14, marginTop: 4 }}>
              Since {new Date(currentSession.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '20px 24px 0' }}>
        <DashCard title="Goals">
          {bigGoals.length === 0 && !addingGoal && (
            <div style={styles.emptyState}>Add a few goals you are working toward.</div>
          )}
          {(bigGoals.length > 0 || addingGoal) && (
            <div style={styles.goalListHeader}>
              <span aria-hidden="true" />
              <span>Goal</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span>Goal deadline</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>e.g. April 30th</span>
              </div>
              <span aria-hidden="true" />
            </div>
          )}
          {bigGoals.map(goal => (
            <div key={goal.id} style={styles.goalListRow}>
              <button
                type="button"
                onClick={() => toggleGoal(goal.id)}
                style={{ ...checkboxStyle(goal.completed), marginTop: 2 }}
              />
              {editingGoalId === goal.id ? (
                <input
                  autoFocus
                  value={editingGoalText}
                  onChange={e => setEditingGoalText(e.target.value)}
                  onBlur={() => commitGoalEdit(goal.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitGoalEdit(goal.id);
                    if (e.key === 'Escape') setEditingGoalId(null);
                  }}
                  style={{ ...styles.inlineInput, minWidth: 0, width: '100%' }}
                />
              ) : (
                <span
                  onClick={() => {
                    setEditingGoalId(goal.id);
                    setEditingGoalText(goal.text);
                  }}
                  style={{
                    minWidth: 0,
                    color: goal.completed ? '#94a3b8' : '#0f172a',
                    fontFamily: font,
                    fontSize: 15,
                    textDecoration: goal.completed ? 'line-through' : 'none',
                    cursor: 'text',
                    lineHeight: 1.45,
                  }}
                >
                  {goal.text}
                </span>
              )}
              <DeadlineCell
                value={goal.deadline}
                completed={goal.completed}
                onChange={v => setGoalDeadline(goal.id, v)}
              />
              <button type="button" onClick={() => deleteGoal(goal.id)} style={{ ...styles.ghostBtn, marginTop: 2 }}>
                Remove
              </button>
            </div>
          ))}
          {addingGoal ? (
            <div style={{ ...styles.goalListRow, marginTop: 10 }}>
              <span aria-hidden="true" />
              <input
                autoFocus
                value={newGoalText}
                onChange={e => setNewGoalText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addGoal();
                  if (e.key === 'Escape') {
                    setAddingGoal(false);
                    setNewGoalText('');
                    setNewGoalDeadline('');
                  }
                }}
                placeholder="Goal text"
                style={{ ...styles.fieldInput, minWidth: 0, width: '100%', padding: '8px 10px' }}
              />
              <DeadlineCell value={newGoalDeadline} completed={false} onChange={setNewGoalDeadline} />
              <button type="button" onClick={addGoal} style={{ ...styles.primaryBtn, marginTop: 2 }}>
                Add
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingGoal(true)} style={styles.addRow}>
              + Add goal
            </button>
          )}
        </DashCard>

        <DashCard title="Projects">
          {projects.length === 0 && !addingProject && (
            <div style={styles.emptyState}>Track projects you are building.</div>
          )}
          {projects.map(p => (
            <div key={p.id} style={styles.listRow}>
              <button
                type="button"
                onClick={() => cycleStatus(p.id)}
                title="Click to change status"
                style={{
                  ...styles.statusBadge,
                  color:
                    p.status === 'active' ? '#15803d' : p.status === 'paused' ? '#b45309' : '#64748b',
                  borderColor:
                    p.status === 'active' ? '#bbf7d0' : p.status === 'paused' ? '#fde68a' : '#e2e8f0',
                  background:
                    p.status === 'active' ? '#f0fdf4' : p.status === 'paused' ? '#fffbeb' : '#f8fafc',
                }}
              >
                {p.status}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={projectNameStyle}>{p.name}</div>
                {p.description && (
                  <div style={{ color: '#64748b', fontFamily: font, fontSize: 14, marginTop: 4 }}>
                    {p.description}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => deleteProject(p.id)} style={styles.ghostBtn}>
                Remove
              </button>
            </div>
          ))}
          {addingProject ? (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                autoFocus
                value={newProject.name}
                onChange={e => setNewProject(pr => ({ ...pr, name: e.target.value }))}
                placeholder="Project name"
                style={styles.fieldInput}
              />
              <input
                value={newProject.description}
                onChange={e => setNewProject(pr => ({ ...pr, description: e.target.value }))}
                placeholder="Description (optional)"
                style={styles.fieldInput}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={addProject} style={styles.primaryBtn}>
                  Add
                </button>
                <button type="button" onClick={() => setAddingProject(false)} style={styles.secondaryBtn}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingProject(true)} style={styles.addRow}>
              + Add project
            </button>
          )}
        </DashCard>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <DashCard title="Open loops">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {openLoops.map(loop => (
              <div
                key={loop.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${loop.resolved ? '#e2e8f0' : '#fed7aa'}`,
                  borderRadius: 10,
                  padding: 14,
                  opacity: loop.resolved ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
                }}
              >
                <div style={styles.loopLabel}>Requirement</div>
                <div style={{ color: '#0f172a', fontFamily: font, fontSize: 15, marginBottom: 10, lineHeight: 1.5 }}>
                  {loop.requirement}
                </div>
                <div style={styles.loopLabel}>Next action</div>
                <div style={{ color: '#475569', fontFamily: font, fontSize: 14, marginBottom: 6, lineHeight: 1.5 }}>
                  {loop.action}
                </div>
                {loop.scheduledTime && (
                  <div style={{ color: '#1d4ed8', fontFamily: font, fontSize: 14, marginBottom: 8 }}>
                    {loop.scheduledTime}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => toggleLoop(loop.id)} style={openLoopPrimaryStyle(loop.resolved)}>
                    {loop.resolved ? 'Reopen' : 'Mark done'}
                  </button>
                  <button type="button" onClick={() => deleteLoop(loop.id)} style={styles.secondaryBtnSmall}>
                    Delete
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setShowLoopModal(true)} style={styles.addLoopCard}>
              <span style={{ fontSize: 22, marginBottom: 4 }}>+</span>
              Add open loop
            </button>
          </div>
        </DashCard>
      </div>

      <div style={{ padding: '20px 24px 32px' }}>
        <DashCard title="Notes" noPad>
          <AppleNotesPanel />
        </DashCard>
      </div>

      {showLoopModal && (
        <div
          style={styles.modalOverlay}
          onClick={e => {
            if (e.target === e.currentTarget) resetLoopModal();
          }}
        >
          <div style={styles.modal}>
            <div style={{ color: '#b45309', fontFamily: font, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              New open loop — step {loopStep} of 2
            </div>

            {loopStep === 1 ? (
              <>
                <p style={styles.modalQuestion}>What is blocked or waiting on something else?</p>
                <p style={styles.modalHint}>Describe the dependency or requirement.</p>
                <textarea
                  autoFocus
                  value={loopReq}
                  onChange={e => setLoopReq(e.target.value)}
                  placeholder="Example: Need approval before I can send the proposal."
                  rows={3}
                  style={{
                    ...styles.fieldInput,
                    width: '100%',
                    resize: 'vertical',
                    marginBottom: 16,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => loopReq.trim() && setLoopStep(2)}
                    style={{ ...styles.primaryBtn, opacity: loopReq.trim() ? 1 : 0.45 }}
                  >
                    Next
                  </button>
                  <button type="button" onClick={resetLoopModal} style={styles.secondaryBtn}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.modalReqPreview}>{loopReq}</div>
                <p style={styles.modalQuestion}>What will you do, and when?</p>
                <textarea
                  autoFocus
                  value={loopAction}
                  onChange={e => setLoopAction(e.target.value)}
                  placeholder="Concrete next step"
                  rows={2}
                  style={{
                    ...styles.fieldInput,
                    width: '100%',
                    resize: 'none',
                    marginBottom: 10,
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  value={loopTime}
                  onChange={e => setLoopTime(e.target.value)}
                  placeholder="When (e.g. Friday 3pm)"
                  style={{ ...styles.fieldInput, width: '100%', boxSizing: 'border-box', marginBottom: 16 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={submitLoop}
                    style={{ ...styles.primaryBtn, opacity: loopAction.trim() ? 1 : 0.45 }}
                  >
                    Save
                  </button>
                  <button type="button" onClick={() => setLoopStep(1)} style={styles.secondaryBtn}>
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashCard({
  title,
  children,
  noPad,
}: {
  title: string;
  children: React.ReactNode;
  noPad?: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ color: '#0f172a', fontFamily: font, fontSize: 15, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={noPad ? undefined : { padding: '12px 16px' }}>{children}</div>
    </div>
  );
}

function checkboxStyle(checked: boolean): CSSProperties {
  return {
    width: 18,
    height: 18,
    border: `2px solid ${checked ? '#15803d' : '#cbd5e1'}`,
    background: checked ? '#15803d' : '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

const styles: Record<string, CSSProperties> = {
  timeBanner: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  bannerLabel: {
    color: '#64748b',
    fontFamily: font,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
  },
  divider: { width: 1, height: 48, background: '#e2e8f0' },
  emptyState: {
    color: '#64748b',
    fontFamily: font,
    fontSize: 14,
    padding: '8px 0 12px',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  goalListHeader: {
    display: 'grid',
    gridTemplateColumns: '18px 1fr minmax(200px, 1.15fr) 72px',
    gap: 10,
    alignItems: 'flex-end',
    padding: '4px 0 10px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    fontFamily: font,
    letterSpacing: 0.02,
  },
  goalListRow: {
    display: 'grid',
    gridTemplateColumns: '18px 1fr minmax(200px, 1.15fr) 72px',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  goalDateInput: {
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    color: '#0f172a',
    fontFamily: font,
    fontSize: 13,
    padding: '6px 8px',
    outline: 'none',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  inlineInput: {
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    color: '#0f172a',
    fontFamily: font,
    fontSize: 15,
    padding: '6px 10px',
    outline: 'none',
  },
  fieldInput: {
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    color: '#0f172a',
    fontFamily: font,
    fontSize: 15,
    padding: '10px 12px',
    outline: 'none',
    display: 'block',
  },
  ghostBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 13,
    padding: '4px 6px',
    fontFamily: font,
    flexShrink: 0,
    textDecoration: 'underline',
  },
  primaryBtn: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontFamily: font,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: '#fff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '8px 16px',
    fontFamily: font,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryBtnSmall: {
    background: '#fff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '6px 12px',
    fontFamily: font,
    fontSize: 13,
    cursor: 'pointer',
  },
  addRow: {
    background: 'transparent',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    fontFamily: font,
    fontSize: 14,
    padding: '10px 0 4px',
    textAlign: 'left',
    display: 'block',
  },
  statusBadge: {
    border: '1px solid',
    borderRadius: 8,
    padding: '4px 10px',
    fontFamily: font,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    textTransform: 'capitalize' as const,
  },
  loopLabel: {
    color: '#b45309',
    fontFamily: font,
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
  },
  addLoopCard: {
    background: '#fffbeb',
    border: '1px dashed #fdba74',
    borderRadius: 10,
    padding: 16,
    color: '#b45309',
    fontFamily: font,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: 80,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 24,
    width: 500,
    maxWidth: '92vw',
    boxShadow: '0 20px 40px rgba(15,23,42,0.12)',
  },
  modalQuestion: {
    color: '#0f172a',
    fontFamily: font,
    fontSize: 17,
    marginBottom: 8,
    marginTop: 0,
    lineHeight: 1.45,
    fontWeight: 700,
  },
  modalHint: {
    color: '#64748b',
    fontFamily: font,
    fontSize: 14,
    marginBottom: 14,
    marginTop: 0,
    lineHeight: 1.5,
  },
  modalReqPreview: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#475569',
    fontFamily: font,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 1.5,
  },
};

function openLoopPrimaryStyle(resolved: boolean): CSSProperties {
  return {
    ...styles.primaryBtn,
    fontSize: 13,
    padding: '6px 12px',
    background: resolved ? '#e2e8f0' : '#0f172a',
    color: resolved ? '#64748b' : '#fff',
  };
}
