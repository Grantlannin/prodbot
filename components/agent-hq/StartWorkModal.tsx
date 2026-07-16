'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { ProjectBoard, FocusLockMode } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useHoverTimer } from './hooks/HoverTimerProvider';
import { listWorkPartGroups, makeProjectTaskId, newProjectTask, sessionLabel, type ListedWorkTask } from './quickstartTask';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const PROJECTS_KEY = 'agentHQ_projects';
const DURATION_PRESETS = [15, 25, 30, 45, 60, 90];

type Step = 'select-task' | 'new-task' | 'select-project' | 'new-project' | 'select-duration';
type StartWorkModalMode = 'start' | 'set-timer';

interface PendingSession {
  label: string;
  taskRef?: { projectId: string; taskId: string; subTaskId?: string };
}

export type StartWorkPreset = PendingSession;

interface StartWorkModalProps {
  open: boolean;
  onClose: () => void;
  mode?: StartWorkModalMode;
  preset?: PendingSession | null;
  onSessionStarted?: (info: { projectId: string; taskId: string; subTaskId?: string; label: string }) => void;
}

export default function StartWorkModal({
  open,
  onClose,
  mode = 'start',
  preset = null,
  onSessionStarted,
}: StartWorkModalProps) {
  const [expandedPartKey, setExpandedPartKey] = useState<string | null>(null);
  const [projects, setProjects] = useLocalStorage<ProjectBoard[]>(PROJECTS_KEY, []);
  const [step, setStep] = useState<Step>('select-task');
  const [newTaskText, setNewTaskText] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [lockMode, setLockMode] = useState<FocusLockMode>('none');
  const { startSession, status } = useWorkTrackerContext();
  const { requestOpen } = useHoverTimer();

  const partGroups = useMemo(() => listWorkPartGroups(projects), [projects]);
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [projects]
  );

  const busy = status === 'working' || status === 'on_break';
  const isSetTimer = mode === 'set-timer';

  useEffect(() => {
    if (!open) return;
    if (preset) {
      setPendingSession(preset);
      setStep('select-duration');
      setDurationMinutes(25);
      setLockMode('none');
      setExpandedPartKey(null);
      return;
    }
    setStep('select-task');
    setNewTaskText('');
    setNewProjectName('');
    setPendingSession(null);
    setDurationMinutes(25);
    setLockMode('none');
    setExpandedPartKey(null);
  }, [open, mode, preset]);

  const close = () => {
    onClose();
  };

  const beginSession = (
    label: string,
    taskRef?: { projectId: string; taskId: string; subTaskId?: string },
    countdownMinutes?: number,
    sessionLockMode: FocusLockMode = 'none'
  ) => {
    if (busy) return;
    const minutes = countdownMinutes && countdownMinutes > 0 ? countdownMinutes : durationMinutes;
    if (minutes <= 0) return;
    startSession({
      project: label,
      type: 'open',
      countdownTargetMs: minutes * 60 * 1000,
      lockMode: sessionLockMode,
    });
    requestOpen();
    if (taskRef) {
      onSessionStarted?.({ ...taskRef, label });
    }
    close();
  };

  const queueOrStart = (
    label: string,
    taskRef?: { projectId: string; taskId: string; subTaskId?: string }
  ) => {
    setPendingSession({ label, taskRef });
    setDurationMinutes(25);
    setLockMode('none');
    setStep('select-duration');
  };

  const handlePickTask = (task: ListedWorkTask) => {
    queueOrStart(task.label, {
      projectId: task.projectId,
      taskId: task.taskId,
      ...(task.subTaskId ? { subTaskId: task.subTaskId } : {}),
    });
  };

  const partGroupKey = (projectId: string, partId: string) => `${projectId}:${partId}`;

  const handleNewTaskContinue = () => {
    const text = newTaskText.trim();
    if (!text) return;
    setStep(sortedProjects.length > 0 ? 'select-project' : 'new-project');
  };

  const handlePickProject = (project: ProjectBoard) => {
    const text = newTaskText.trim();
    if (!text) return;
    const projectName = project.name.trim() || 'Untitled project';
    const existing = project.tasks.find(t => t.text.trim() === text);
    let taskId = existing?.id;
    if (!existing) {
      const task = newProjectTask(text);
      taskId = task.id;
      setProjects(prev =>
        prev.map(p =>
          p.id === project.id ? { ...p, tasks: [...p.tasks, task], updatedAt: Date.now() } : p
        )
      );
    }
    queueOrStart(sessionLabel(projectName, text), { projectId: project.id, taskId: taskId! });
  };

  const handleCreateProject = () => {
    const text = newTaskText.trim();
    const name = newProjectName.trim();
    if (!text || !name) return;
    const now = Date.now();
    const task = newProjectTask(text);
    const project: ProjectBoard = {
      id: makeProjectTaskId(),
      name,
      tasks: [task],
      createdAt: now,
      updatedAt: now,
    };
    setProjects(prev => [project, ...prev]);
    queueOrStart(sessionLabel(name, text), { projectId: project.id, taskId: task.id });
  };

  const handleStartCountdown = () => {
    if (!pendingSession || durationMinutes <= 0) return;
    beginSession(pendingSession.label, pendingSession.taskRef, durationMinutes, lockMode);
  };

  const selectTaskTitle = isSetTimer ? 'Set timer — pick a task' : 'What are you working on?';

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div style={styles.backdrop} onClick={close} role="presentation">
      <div
        style={styles.panel}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-work-title"
      >
        {step === 'select-task' ? (
          <>
            <h3 id="start-work-title" style={styles.title}>
              {selectTaskTitle}
            </h3>
            {busy ? (
              <p style={styles.busy}>You already have a session running. Stop it first to start something new.</p>
            ) : null}
            <div style={styles.taskList}>
              {partGroups.length === 0 ? (
                <p style={styles.empty}>No tasks in your projects yet.</p>
              ) : (
                partGroups.map(group => {
                  const key = partGroupKey(group.projectId, group.part.taskId);
                  const hasSubs = group.subTasks.length > 0;
                  const expanded = expandedPartKey === key;
                  return (
                    <div key={key} style={styles.partGroup}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (hasSubs) {
                            setExpandedPartKey(expanded ? null : key);
                            return;
                          }
                          handlePickTask(group.part);
                        }}
                        style={{
                          ...styles.taskBtn,
                          ...(busy ? styles.taskBtnDisabled : {}),
                          ...(hasSubs && expanded ? styles.taskBtnExpanded : {}),
                        }}
                      >
                        <span style={styles.taskBtnRow}>
                          <span style={styles.taskBtnMain}>
                            <span style={styles.partBtnText}>{group.part.taskText}</span>
                            <span style={styles.taskBtnMeta}>{group.projectName}</span>
                          </span>
                          {hasSubs ? (
                            <span style={styles.expandHint} aria-hidden>
                              {expanded ? '▾' : '▸'}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {hasSubs && expanded ? (
                        <div style={styles.subTaskList}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handlePickTask(group.part)}
                            style={{
                              ...styles.subTaskBtn,
                              ...(busy ? styles.taskBtnDisabled : {}),
                            }}
                          >
                            <span style={styles.subTaskBtnText}>Whole part</span>
                          </button>
                          {group.subTasks.map(sub => (
                            <button
                              key={sub.subTaskId}
                              type="button"
                              disabled={busy}
                              onClick={() => handlePickTask(sub)}
                              style={{
                                ...styles.subTaskBtn,
                                ...(busy ? styles.taskBtnDisabled : {}),
                              }}
                            >
                              <span style={styles.subTaskBtnText}>{sub.taskText}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep('new-task')}
              style={{ ...styles.newTaskBtn, ...(busy ? styles.newTaskBtnDisabled : {}) }}
            >
              New task
            </button>
          </>
        ) : null}

        {step === 'select-duration' && pendingSession ? (
          <>
            <h3 style={styles.title}>{isSetTimer ? 'Set countdown' : 'Focus session'}</h3>
            <p style={styles.subtitle}>{pendingSession.label}</p>
            <p style={styles.durationHint}>Timer counts down to 0. Work time still tracks in the background.</p>
            <div style={styles.presetRow}>
              {DURATION_PRESETS.map(min => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDurationMinutes(min)}
                  style={{
                    ...styles.presetBtn,
                    ...(durationMinutes === min ? styles.presetBtnActive : {}),
                  }}
                >
                  {min}m
                </button>
              ))}
            </div>
            <label style={styles.durationLabel} htmlFor="countdown-minutes">
              Custom (minutes)
            </label>
            <input
              id="countdown-minutes"
              type="number"
              min={1}
              max={480}
              value={durationMinutes}
              onChange={e => setDurationMinutes(Math.max(1, Number(e.target.value) || 1))}
              style={styles.input}
            />
            <div style={styles.lockSection}>
              <div style={styles.lockLabel}>Lock mode</div>
              <div style={styles.lockRow}>
                <button
                  type="button"
                  onClick={() => setLockMode('none')}
                  style={{
                    ...styles.lockBtn,
                    ...(lockMode === 'none' ? styles.lockBtnActive : {}),
                  }}
                >
                  No lock
                </button>
                <button
                  type="button"
                  onClick={() => setLockMode('soft')}
                  style={{
                    ...styles.lockBtn,
                    ...(lockMode === 'soft' ? styles.lockBtnActive : {}),
                  }}
                >
                  Soft
                </button>
                <button
                  type="button"
                  onClick={() => setLockMode('hard')}
                  style={{
                    ...styles.lockBtn,
                    ...(lockMode === 'hard' ? styles.lockBtnActive : {}),
                  }}
                >
                  Hard
                </button>
              </div>
              <p style={styles.lockHint}>
                {lockMode === 'none'
                  ? 'End the session anytime — no cooldown or escape flow.'
                  : lockMode === 'soft'
                    ? 'End early after a 2-minute wait and confirmation.'
                    : 'No normal early end — hold 10s and type a phrase to escape.'}
              </p>
            </div>
            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => {
                  setPendingSession(null);
                  setStep('select-task');
                }}
                style={styles.secondaryBtn}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleStartCountdown}
                disabled={busy || durationMinutes <= 0}
                style={{
                  ...styles.primaryBtn,
                  ...(busy || durationMinutes <= 0 ? styles.primaryBtnDisabled : {}),
                }}
              >
                Start session
              </button>
            </div>
          </>
        ) : null}

        {step === 'new-task' ? (
          <>
            <h3 style={styles.title}>New task</h3>
            <p style={styles.subtitle}>What are you working on?</p>
            <input
              type="text"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleNewTaskContinue();
                }
              }}
              placeholder="Describe the task…"
              style={styles.input}
              autoFocus
            />
            <div style={styles.actions}>
              <button type="button" onClick={() => setStep('select-task')} style={styles.secondaryBtn}>
                Back
              </button>
              <button
                type="button"
                onClick={handleNewTaskContinue}
                disabled={!newTaskText.trim()}
                style={{
                  ...styles.primaryBtn,
                  ...(!newTaskText.trim() ? styles.primaryBtnDisabled : {}),
                }}
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === 'select-project' ? (
          <>
            <h3 style={styles.title}>What project is this for?</h3>
            <p style={styles.subtitle}>{newTaskText.trim()}</p>
            <div style={styles.taskList}>
              {sortedProjects.map(project => (
                <button
                  key={project.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handlePickProject(project)}
                  style={{
                    ...styles.taskBtn,
                    ...(busy ? styles.taskBtnDisabled : {}),
                  }}
                >
                  <span style={styles.taskBtnText}>{project.name.trim() || 'Untitled project'}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep('new-project')}
              style={{ ...styles.newTaskBtn, ...(busy ? styles.newTaskBtnDisabled : {}) }}
            >
              Create new project
            </button>
            <div style={{ ...styles.actions, marginTop: 12 }}>
              <button type="button" onClick={() => setStep('new-task')} style={styles.secondaryBtn}>
                Back
              </button>
            </div>
          </>
        ) : null}

        {step === 'new-project' ? (
          <>
            <h3 style={styles.title}>Create new project</h3>
            <p style={styles.subtitle}>Task: {newTaskText.trim()}</p>
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateProject();
                }
              }}
              placeholder="Project name…"
              style={styles.input}
              autoFocus
            />
            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => setStep(sortedProjects.length > 0 ? 'select-project' : 'new-task')}
                style={styles.secondaryBtn}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || busy}
                style={{
                  ...styles.primaryBtn,
                  ...(!newProjectName.trim() || busy ? styles.primaryBtnDisabled : {}),
                }}
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === 'select-task' ? (
          <div style={styles.actions}>
            <button type="button" onClick={close} style={styles.secondaryBtn}>
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  panel: {
    width: 'min(100%, 420px)',
    maxHeight: 'min(85vh, 560px)',
    background: '#fff',
    borderRadius: 12,
    padding: '20px 22px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.45,
  },
  durationHint: {
    margin: '6px 0 0',
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  busy: {
    margin: '10px 0 0',
    fontSize: 12,
    color: '#b45309',
    lineHeight: 1.4,
  },
  taskList: {
    marginTop: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    overflowY: 'auto',
    maxHeight: 280,
  },
  empty: {
    margin: 0,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.45,
  },
  taskBtn: {
    width: '100%',
    textAlign: 'left',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: font,
  },
  taskBtnExpanded: {
    borderColor: '#cbd5e1',
    background: '#f8fafc',
  },
  partGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  taskBtnRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  taskBtnMain: {
    minWidth: 0,
    flex: 1,
  },
  expandHint: {
    flexShrink: 0,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1,
  },
  subTaskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingLeft: 12,
    borderLeft: '2px solid #e2e8f0',
    marginLeft: 10,
  },
  subTaskBtn: {
    width: '100%',
    textAlign: 'left',
    border: '1px solid #eef2f6',
    borderRadius: 6,
    padding: '8px 10px',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: font,
  },
  subTaskBtnText: {
    display: 'block',
    fontSize: 13,
    fontWeight: 400,
    color: '#475569',
    lineHeight: 1.3,
  },
  taskBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  taskBtnText: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  partBtnText: {
    display: 'block',
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  taskBtnMeta: {
    display: 'block',
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
  },
  newTaskBtn: {
    marginTop: 10,
    width: '100%',
    border: '1px dashed #cbd5e1',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#f8fafc',
    color: '#334155',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
  newTaskBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  presetRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  presetBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '7px 12px',
    background: '#fff',
    color: '#475569',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
  presetBtnActive: {
    background: '#0f172a',
    color: '#fff',
    borderColor: '#0f172a',
  },
  durationLabel: {
    display: 'block',
    marginTop: 14,
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
  },
  lockSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: '1px solid #eef2f6',
  },
  lockLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 8,
  },
  lockRow: {
    display: 'flex',
    gap: 6,
  },
  lockBtn: {
    flex: 1,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '7px 6px',
    background: '#fff',
    color: '#475569',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
  lockBtnActive: {
    background: '#0f172a',
    color: '#fff',
    borderColor: '#0f172a',
  },
  lockHint: {
    margin: '8px 0 0',
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  input: {
    width: '100%',
    marginTop: 6,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: font,
    color: '#0f172a',
    boxSizing: 'border-box',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    flexShrink: 0,
  },
  secondaryBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
};
