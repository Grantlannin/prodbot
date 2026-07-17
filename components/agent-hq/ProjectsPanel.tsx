'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, type CSSProperties } from 'react';
import type { ProjectBoard, ProjectSubTask, ProjectTask, TaskContextLink } from './types';
import { useProjects } from './hooks/ProjectsProvider';
import TaskContextLinksBox from './TaskContextLinksBox';
import AppleNotesEditorModal from './AppleNotesEditorModal';
import ProjectCompletionOverlay from './ProjectCompletionOverlay';
import { getProjectProgress, type ProjectProgress } from './projectProgress';
import { sessionLabel } from './quickstartTask';
import StartWorkModal from './StartWorkModal';
import { useUserProfile } from './hooks/UserProfileProvider';
import { triggerCelebration } from './celebrationEffects';
import { FOCUS_PROJECT_KEY } from './stuckHelp/projectMutations';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const LEGACY_THINGS_KEY = 'agentHQ_things';
const TASK_LIST_VISIBLE_ROWS = 5;
const TASK_ROW_HEIGHT_PX = 34;
const TASK_ROW_GAP_PX = 6;
const TASK_LIST_SCROLL_HEIGHT =
  TASK_LIST_VISIBLE_ROWS * TASK_ROW_HEIGHT_PX + (TASK_LIST_VISIBLE_ROWS - 1) * TASK_ROW_GAP_PX;

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function displayName(project: ProjectBoard): string {
  const n = project.name.trim();
  if (!n) return 'Untitled thing';
  return n.length > 36 ? n.slice(0, 33) + '…' : n;
}

function emptySubTask(): ProjectSubTask {
  return { id: makeId(), text: '', done: false, createdAt: Date.now(), contextLinks: [] };
}

function emptyTask(): ProjectTask {
  return { id: makeId(), text: '', done: false, createdAt: Date.now(), contextLinks: [], subTasks: [] };
}

function normalizeTask(task: ProjectTask): ProjectTask {
  if (task.contextLinks?.length) {
    return { ...task, contextLinks: task.contextLinks, docUrl: undefined };
  }
  if (task.docUrl?.trim()) {
    return {
      ...task,
      contextLinks: [{ id: makeId(), url: task.docUrl.trim(), createdAt: task.createdAt }],
      docUrl: undefined,
    };
  }
  return {
    ...task,
    contextLinks: task.contextLinks ?? [],
    subTasks: (task.subTasks ?? []).map(normalizeSubTask),
  };
}

function normalizeSubTask(sub: ProjectSubTask): ProjectSubTask {
  return { ...sub, contextLinks: sub.contextLinks ?? [] };
}

function taskLinks(task: ProjectTask): TaskContextLink[] {
  return normalizeTask(task).contextLinks ?? [];
}

function subTaskLinks(sub: ProjectSubTask): TaskContextLink[] {
  return normalizeSubTask(sub).contextLinks ?? [];
}

function subTaskKey(taskId: string, subTaskId: string): string {
  return `${taskId}:${subTaskId}`;
}

function partLinksKey(taskId: string): string {
  return `part:${taskId}`;
}

function subLinksKey(taskId: string, subTaskId: string): string {
  return `sub:${subTaskKey(taskId, subTaskId)}`;
}

function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) {
    return list;
  }
  const next = [...list];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

const PART_DRAG_TYPE = 'application/x-daywinner-part-index';
const SUBTASK_DRAG_TYPE = 'application/x-daywinner-subtask';

function shouldBlockRowDrag(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, button, textarea, select, a, [role="button"]'));
}

type NotesEditorTarget =
  | { kind: 'project'; projectId: string }
  | { kind: 'task'; projectId: string; taskId: string }
  | { kind: 'subTask'; projectId: string; taskId: string; subTaskId: string };

type QuickstartTarget = {
  label: string;
  taskRef: { projectId: string; taskId: string; subTaskId?: string };
};

function NoteIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ opacity: active ? 1 : 0.72 }}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function TimerStartIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export interface ProjectsPanelHandle {
  addProject: () => void;
}

export interface ProjectsPanelProps {
  onProjectCompleted?: (payload: { text: string; detail: string; projectId: string }) => void;
  onSelectedProgressChange?: (progress: ProjectProgress | null) => void;
}

export const addProjectBtnStyle: CSSProperties = {
  background: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: font,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ProjectsPanel = forwardRef<ProjectsPanelHandle, ProjectsPanelProps>(function ProjectsPanel(
  { onProjectCompleted, onSelectedProgressChange },
  ref
) {
  const { projects, setProjects } = useProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusSubTaskKey, setFocusSubTaskKey] = useState<string | null>(null);
  const [openLinksKey, setOpenLinksKey] = useState<string | null>(null);
  const [notesEditor, setNotesEditor] = useState<NotesEditorTarget | null>(null);
  const [quickstartTarget, setQuickstartTarget] = useState<QuickstartTarget | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [partDropIndex, setPartDropIndex] = useState<number | null>(null);
  const [draggingPartIndex, setDraggingPartIndex] = useState<number | null>(null);
  const [subDrop, setSubDrop] = useState<{ taskId: string; index: number } | null>(null);
  const [draggingSub, setDraggingSub] = useState<{ taskId: string; subId: string; fromIndex: number } | null>(
    null
  );
  const { celebration, getCelebrationMessage } = useUserProfile();
  const nameRef = useRef<HTMLInputElement>(null);
  const taskInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const subTaskInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [migrated, setMigrated] = useState(false);
  const linksMigratedRef = useRef(false);

  const selected = projects.find(p => p.id === selectedId) ?? null;
  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    if (migrated) return;
    setMigrated(true);
    if (projects.length > 0) return;
    try {
      const raw = localStorage.getItem(LEGACY_THINGS_KEY);
      if (!raw) return;
      const legacy = JSON.parse(raw) as { id: string; title: string; body: string; createdAt: number; updatedAt: number }[];
      if (!Array.isArray(legacy) || legacy.length === 0) return;
      const migratedProjects: ProjectBoard[] = legacy.map(item => ({
        id: item.id,
        name: item.title.trim() || 'Untitled thing',
        tasks: item.body.trim()
          ? [{ id: makeId(), text: item.body.trim(), done: false, createdAt: item.createdAt }]
          : [emptyTask()],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      setProjects(migratedProjects);
    } catch {
      /* ignore */
    }
  }, [migrated, projects.length, setProjects]);

  useEffect(() => {
    if (linksMigratedRef.current) return;
    const needsMigration = projects.some(p =>
      p.tasks.some(t => {
        if (Boolean(t.docUrl?.trim()) || t.contextLinks === undefined || t.subTasks === undefined) {
          return true;
        }
        return (t.subTasks ?? []).some(st => st.contextLinks === undefined);
      })
    );
    if (!needsMigration) {
      linksMigratedRef.current = true;
      return;
    }
    linksMigratedRef.current = true;
    setProjects(prev =>
      prev.map(p => ({
        ...p,
        tasks: p.tasks.map(t => normalizeTask(t)),
      }))
    );
  }, [projects, setProjects]);

  useEffect(() => {
    if (selectedId && !projects.some(p => p.id === selectedId)) {
      setSelectedId(sorted[0]?.id ?? null);
    }
  }, [projects, selectedId, sorted]);

  const focusProjectInPanel = useCallback(
    (projectId: string) => {
      if (!projects.some(project => project.id === projectId)) return;
      setSelectedId(projectId);
      try {
        localStorage.removeItem(FOCUS_PROJECT_KEY);
      } catch {
        /* ignore */
      }
    },
    [projects]
  );

  useEffect(() => {
    const onFocusProject = (event: Event) => {
      const projectId = (event as CustomEvent<{ projectId?: string }>).detail?.projectId;
      if (projectId) focusProjectInPanel(projectId);
    };
    window.addEventListener('agentHQ:focusProject', onFocusProject);
    return () => window.removeEventListener('agentHQ:focusProject', onFocusProject);
  }, [focusProjectInPanel]);

  useEffect(() => {
    try {
      const projectId = localStorage.getItem(FOCUS_PROJECT_KEY);
      if (projectId) focusProjectInPanel(projectId);
    } catch {
      /* ignore */
    }
  }, [projects, focusProjectInPanel]);

  useEffect(() => {
    if (!focusTaskId) return;
    const el = taskInputRefs.current.get(focusTaskId);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
      setFocusTaskId(null);
    }
  }, [focusTaskId, selected?.tasks]);

  useEffect(() => {
    if (!focusSubTaskKey) return;
    const el = subTaskInputRefs.current.get(focusSubTaskKey);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
      setFocusSubTaskKey(null);
    }
  }, [focusSubTaskKey, selected?.tasks]);

  useEffect(() => {
    if (!onSelectedProgressChange) return;
    if (!selected) {
      onSelectedProgressChange(null);
      return;
    }
    onSelectedProgressChange(getProjectProgress(selected.tasks));
  }, [selected, onSelectedProgressChange]);

  useEffect(() => {
    if (!notesEditor) return;
    if (notesEditor.projectId !== selectedId) setNotesEditor(null);
  }, [selectedId, notesEditor]);

  useEffect(() => {
    if (!notesEditor || notesEditor.kind !== 'task' || !selected) return;
    if (!selected.tasks.some(t => t.id === notesEditor.taskId)) setNotesEditor(null);
  }, [notesEditor, selected]);

  useEffect(() => {
    if (!notesEditor || notesEditor.kind !== 'subTask' || !selected) return;
    const task = selected.tasks.find(t => t.id === notesEditor.taskId);
    if (!task?.subTasks?.some(st => st.id === notesEditor.subTaskId)) setNotesEditor(null);
  }, [notesEditor, selected]);

  const touchProject = useCallback(
    (id: string, patch: Partial<Pick<ProjectBoard, 'name' | 'tasks' | 'notes'>>) => {
      setProjects(prev =>
        prev.map(p => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p))
      );
    },
    [setProjects]
  );

  const addProject = useCallback(() => {
    const now = Date.now();
    const project: ProjectBoard = {
      id: makeId(),
      name: '',
      tasks: [emptyTask()],
      createdAt: now,
      updatedAt: now,
    };
    setProjects(prev => [project, ...prev]);
    setSelectedId(project.id);
    setFocusTaskId(project.tasks[0].id);
    setTimeout(() => nameRef.current?.focus(), 0);
  }, [setProjects]);

  useImperativeHandle(ref, () => ({ addProject }), [addProject]);

  const deleteProject = useCallback(
    (id: string) => {
      if (!confirm('Delete this thing?')) return;
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, setProjects]
  );

  const updateTask = useCallback(
    (projectId: string, taskId: string, patch: Partial<Pick<ProjectTask, 'text' | 'done' | 'contextLinks' | 'notes'>>) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => (t.id === taskId ? { ...t, ...patch } : t)),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const toggleTaskDone = useCallback(
    (projectId: string, taskId: string, done: boolean) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const before = getProjectProgress(project.tasks);
      const nextTasks = project.tasks.map(t => (t.id === taskId ? { ...t, done } : t));
      const after = getProjectProgress(nextTasks);

      updateTask(projectId, taskId, { done });

      if (after.percent === 100 && before.percent < 100 && after.total > 0) {
        const completedTasks = nextTasks.filter(t => t.done && t.text.trim());
        onProjectCompleted?.({
          text: displayName(project),
          detail: completedTasks.map(t => t.text.trim()).join(' · '),
          projectId: project.id,
        });
        queueMicrotask(() => {
          triggerCelebration(celebration, () => setShowCelebration(true));
        });
      }
    },
    [projects, updateTask, celebration, onProjectCompleted]
  );

  const splitTaskAfter = useCallback(
    (projectId: string, afterTaskId: string, beforeText: string, afterText: string) => {
      const task = { ...emptyTask(), text: afterText };
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          const idx = p.tasks.findIndex(t => t.id === afterTaskId);
          if (idx === -1) return p;
          const tasks = [...p.tasks];
          tasks[idx] = { ...tasks[idx], text: beforeText };
          tasks.splice(idx + 1, 0, task);
          return { ...p, tasks, updatedAt: Date.now() };
        })
      );
      setFocusTaskId(task.id);
    },
    [setProjects]
  );

  const appendEmptyTask = useCallback(
    (projectId: string) => {
      const task = emptyTask();
      setProjects(prev =>
        prev.map(p =>
          p.id === projectId ? { ...p, tasks: [...p.tasks, task], updatedAt: Date.now() } : p
        )
      );
      setFocusTaskId(task.id);
    },
    [setProjects]
  );

  const focusOrAppendTask = useCallback(
    (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      const last = project.tasks[project.tasks.length - 1];
      if (last && !last.text.trim()) {
        setFocusTaskId(last.id);
        return;
      }
      appendEmptyTask(projectId);
    },
    [projects, appendEmptyTask]
  );

  const addTaskLink = useCallback(
    (projectId: string, taskId: string, url: string, name: string) => {
      const trimmedName = name.trim();
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              const links = taskLinks(t);
              return {
                ...t,
                contextLinks: [
                  ...links,
                  {
                    id: makeId(),
                    url: url.trim(),
                    ...(trimmedName ? { name: trimmedName } : {}),
                    createdAt: Date.now(),
                  },
                ],
                docUrl: undefined,
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const removeTaskLink = useCallback(
    (projectId: string, taskId: string, linkId: string) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                contextLinks: taskLinks(t).filter(l => l.id !== linkId),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const updateTaskLinkName = useCallback(
    (projectId: string, taskId: string, linkId: string, name: string) => {
      const trimmedName = name.trim();
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                contextLinks: taskLinks(t).map(l => {
                  if (l.id !== linkId) return l;
                  if (!trimmedName) {
                    const { name: _removed, ...rest } = l;
                    return rest;
                  }
                  return { ...l, name: trimmedName };
                }),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const removeTask = useCallback(
    (projectId: string, taskId: string) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          const taskIndex = p.tasks.findIndex(t => t.id === taskId);
          if (taskIndex <= 0) return p;
          return {
            ...p,
            tasks: p.tasks.filter(t => t.id !== taskId),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const removeEmptyTask = useCallback(
    (projectId: string, taskId: string, taskIndex: number) => {
      if (taskIndex <= 0) return;
      const project = projects.find(p => p.id === projectId);
      const prevId = project?.tasks[taskIndex - 1]?.id;
      removeTask(projectId, taskId);
      if (prevId) setFocusTaskId(prevId);
    },
    [projects, removeTask]
  );

  const addSubTask = useCallback(
    (projectId: string, taskId: string) => {
      const sub = emptySubTask();
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, subTasks: [...(t.subTasks ?? []), sub] };
            }),
            updatedAt: Date.now(),
          };
        })
      );
      setFocusSubTaskKey(subTaskKey(taskId, sub.id));
    },
    [setProjects]
  );

  const splitSubTaskAfter = useCallback(
    (
      projectId: string,
      taskId: string,
      afterSubTaskId: string,
      beforeText: string,
      afterText: string
    ) => {
      const sub = { ...emptySubTask(), text: afterText };
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              const subs = [...(t.subTasks ?? [])];
              const idx = subs.findIndex(s => s.id === afterSubTaskId);
              if (idx === -1) return t;
              subs[idx] = { ...subs[idx], text: beforeText };
              subs.splice(idx + 1, 0, sub);
              return { ...t, subTasks: subs };
            }),
            updatedAt: Date.now(),
          };
        })
      );
      setFocusSubTaskKey(subTaskKey(taskId, sub.id));
    },
    [setProjects]
  );

  const updateSubTask = useCallback(
    (
      projectId: string,
      taskId: string,
      subTaskId: string,
      patch: Partial<Pick<ProjectSubTask, 'text' | 'done' | 'notes' | 'contextLinks'>>
    ) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subTasks: (t.subTasks ?? []).map(st =>
                  st.id === subTaskId ? { ...st, ...patch } : st
                ),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const removeSubTask = useCallback(
    (projectId: string, taskId: string, subTaskId: string) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subTasks: (t.subTasks ?? []).filter(st => st.id !== subTaskId),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const removeEmptySubTask = useCallback(
    (projectId: string, taskId: string, subTaskId: string, subIndex: number) => {
      const project = projects.find(p => p.id === projectId);
      const task = project?.tasks.find(t => t.id === taskId);
      const prevId = task?.subTasks?.[subIndex - 1]?.id;
      removeSubTask(projectId, taskId, subTaskId);
      if (prevId) setFocusSubTaskKey(subTaskKey(taskId, prevId));
    },
    [projects, removeSubTask]
  );

  const reorderTasks = useCallback(
    (projectId: string, fromIndex: number, toIndex: number) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: reorderList(p.tasks, fromIndex, toIndex),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const reorderSubTasks = useCallback(
    (projectId: string, taskId: string, fromIndex: number, toIndex: number) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subTasks: reorderList(t.subTasks ?? [], fromIndex, toIndex),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const clearPartDrag = useCallback(() => {
    setDraggingPartIndex(null);
    setPartDropIndex(null);
  }, []);

  const clearSubDrag = useCallback(() => {
    setDraggingSub(null);
    setSubDrop(null);
  }, []);

  const addSubTaskLink = useCallback(
    (projectId: string, taskId: string, subTaskId: string, url: string, name: string) => {
      const trimmedName = name.trim();
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subTasks: (t.subTasks ?? []).map(st => {
                  if (st.id !== subTaskId) return st;
                  return {
                    ...st,
                    contextLinks: [
                      ...subTaskLinks(st),
                      {
                        id: makeId(),
                        url: url.trim(),
                        ...(trimmedName ? { name: trimmedName } : {}),
                        createdAt: Date.now(),
                      },
                    ],
                  };
                }),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const removeSubTaskLink = useCallback(
    (projectId: string, taskId: string, subTaskId: string, linkId: string) => {
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subTasks: (t.subTasks ?? []).map(st => {
                  if (st.id !== subTaskId) return st;
                  return {
                    ...st,
                    contextLinks: subTaskLinks(st).filter(l => l.id !== linkId),
                  };
                }),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const updateSubTaskLinkName = useCallback(
    (projectId: string, taskId: string, subTaskId: string, linkId: string, name: string) => {
      const trimmedName = name.trim();
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subTasks: (t.subTasks ?? []).map(st => {
                  if (st.id !== subTaskId) return st;
                  return {
                    ...st,
                    contextLinks: subTaskLinks(st).map(l => {
                      if (l.id !== linkId) return l;
                      if (!trimmedName) {
                        const { name: _removed, ...rest } = l;
                        return rest;
                      }
                      return { ...l, name: trimmedName };
                    }),
                  };
                }),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [setProjects]
  );

  const notesEditorValue = (() => {
    if (!notesEditor || !selected) return '';
    if (notesEditor.kind === 'project') return selected.notes ?? '';
    if (notesEditor.kind === 'task') {
      return selected.tasks.find(t => t.id === notesEditor.taskId)?.notes ?? '';
    }
    const task = selected.tasks.find(t => t.id === notesEditor.taskId);
    return task?.subTasks?.find(st => st.id === notesEditor.subTaskId)?.notes ?? '';
  })();

  const notesEditorTitle = (() => {
    if (!notesEditor || !selected) return 'Notes';
    if (notesEditor.kind === 'project') {
      const name = displayName(selected);
      return name === 'Untitled thing' ? 'Project notes/context' : `${name} notes/context`;
    }
    if (notesEditor.kind === 'task') {
      const task = selected.tasks.find(t => t.id === notesEditor.taskId);
      const label = task?.text.trim();
      return label ? `${label} notes` : 'Part notes';
    }
    const task = selected.tasks.find(t => t.id === notesEditor.taskId);
    const sub = task?.subTasks?.find(st => st.id === notesEditor.subTaskId);
    const label = sub?.text.trim();
    return label ? `${label} notes` : 'Task notes';
  })();

  const updateNotesEditorValue = useCallback(
    (content: string) => {
      if (!notesEditor) return;
      if (notesEditor.kind === 'project') {
        touchProject(notesEditor.projectId, { notes: content });
        return;
      }
      if (notesEditor.kind === 'task') {
        updateTask(notesEditor.projectId, notesEditor.taskId, { notes: content });
        return;
      }
      updateSubTask(notesEditor.projectId, notesEditor.taskId, notesEditor.subTaskId, {
        notes: content,
      });
    },
    [notesEditor, touchProject, updateTask, updateSubTask]
  );

  return (
    <div style={styles.root}>
      <style>{`
        [data-drag-row] { cursor: grab; }
        [data-drag-row] input[type='text'] { cursor: grab; }
        [data-drag-row] input[type='text']:focus { cursor: text; }
        [data-drag-row][data-active-drag='true'],
        [data-drag-row][data-active-drag='true'] * {
          cursor: grabbing !important;
        }
      `}</style>
      <ProjectCompletionOverlay
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        message={getCelebrationMessage()}
        showMessage={celebration.showMessage}
      />
      <AppleNotesEditorModal
        open={notesEditor !== null}
        title={notesEditorTitle}
        value={notesEditorValue}
        onChange={updateNotesEditorValue}
        onClose={() => setNotesEditor(null)}
      />
      <StartWorkModal
        open={quickstartTarget !== null}
        onClose={() => setQuickstartTarget(null)}
        preset={quickstartTarget}
      />
      <div style={styles.split}>
        <aside style={styles.sidebar}>
          {sorted.length === 0 ? (
            <div style={styles.sidebarEmpty}>No things yet.</div>
          ) : (
            <div style={styles.sidebarList}>
              {sorted.map(project => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  style={{
                    ...styles.sidebarItem,
                    ...(project.id === selectedId ? styles.sidebarItemActive : {}),
                  }}
                  title={displayName(project)}
                >
                  <span style={styles.sidebarItemName}>{displayName(project)}</span>
                  <span style={styles.sidebarItemMeta}>
                    {project.tasks.filter(t => t.text.trim()).length} part
                    {project.tasks.filter(t => t.text.trim()).length === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div style={styles.editorPane}>
          {selected ? (
            <>
              <div style={styles.nameBlock}>
                <input
                  id="project-name"
                  ref={nameRef}
                  type="text"
                  value={selected.name}
                  onChange={e => touchProject(selected.id, { name: e.target.value })}
                  placeholder="Name this thing…"
                  style={styles.nameInput}
                  aria-label="Thing name"
                />
              </div>
              <div style={styles.tasksBlock}>
                <div style={styles.taskListHeader}>
                  <span style={styles.taskCompletedLabel}>Completed</span>
                </div>
                <div style={styles.taskList}>
                  {selected.tasks.map((task, taskIndex) => {
                    const links = taskLinks(task);
                    const projectName = displayName(selected);
                    const taskText = task.text.trim();
                    const subTasks = task.subTasks ?? [];
                    return (
                      <div key={task.id} style={styles.pieceBlock}>
                        <div
                          draggable
                          data-drag-row=""
                          data-active-drag={draggingPartIndex === taskIndex ? 'true' : undefined}
                          style={{
                            ...styles.taskRow,
                            ...(draggingPartIndex === taskIndex ? styles.taskRowDragging : {}),
                            ...(partDropIndex === taskIndex && draggingPartIndex !== taskIndex
                              ? styles.taskRowDropTarget
                              : {}),
                          }}
                          onDragStart={e => {
                            if (shouldBlockRowDrag(e.target)) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData(PART_DRAG_TYPE, String(taskIndex));
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggingPartIndex(taskIndex);
                          }}
                          onDragEnd={clearPartDrag}
                          onDragOver={e => {
                            if (draggingPartIndex === null) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setPartDropIndex(taskIndex);
                          }}
                          onDragLeave={e => {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            setPartDropIndex(prev => (prev === taskIndex ? null : prev));
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            const fromIndex =
                              draggingPartIndex ??
                              Number.parseInt(e.dataTransfer.getData(PART_DRAG_TYPE), 10);
                            if (fromIndex !== null && !Number.isNaN(fromIndex)) {
                              reorderTasks(selected.id, fromIndex, taskIndex);
                            }
                            clearPartDrag();
                          }}
                          title="Drag to reorder part"
                        >
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={e => toggleTaskDone(selected.id, task.id, e.target.checked)}
                            style={styles.taskCheck}
                            aria-label="Mark part done"
                          />
                          <input
                            ref={el => {
                              if (el) taskInputRefs.current.set(task.id, el);
                              else taskInputRefs.current.delete(task.id);
                            }}
                            type="text"
                            value={task.text}
                            onChange={e => updateTask(selected.id, task.id, { text: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const input = e.currentTarget;
                                const cursor = input.selectionStart ?? input.value.length;
                                splitTaskAfter(
                                  selected.id,
                                  task.id,
                                  input.value.slice(0, cursor),
                                  input.value.slice(cursor)
                                );
                                return;
                              }
                              if (
                                (e.key === 'Backspace' || e.key === 'Delete') &&
                                !task.text.trim()
                              ) {
                                e.preventDefault();
                                removeEmptyTask(selected.id, task.id, taskIndex);
                              }
                            }}
                            placeholder=""
                            style={{
                              ...styles.taskInput,
                              ...(task.done ? styles.taskInputDone : {}),
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => addSubTask(selected.id, task.id)}
                            style={styles.addSubTaskBtn}
                            aria-label="Add task"
                            title="Add task"
                          >
                            <span style={styles.addSubTaskPlus}>+</span>
                            <span style={styles.addSubTaskLabel}>Add task</span>
                          </button>
                          <TaskContextLinksBox
                            links={links}
                            compact
                            isOpen={openLinksKey === partLinksKey(task.id)}
                            onToggle={() => {
                              setNotesEditor(null);
                              const key = partLinksKey(task.id);
                              setOpenLinksKey(id => (id === key ? null : key));
                            }}
                            onClose={() => setOpenLinksKey(null)}
                            onAddLink={(url, name) => addTaskLink(selected.id, task.id, url, name)}
                            onRemoveLink={linkId => removeTaskLink(selected.id, task.id, linkId)}
                            onUpdateLinkName={(linkId, name) =>
                              updateTaskLinkName(selected.id, task.id, linkId, name)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenLinksKey(null);
                              setNotesEditor({ kind: 'task', projectId: selected.id, taskId: task.id });
                            }}
                            style={{
                              ...styles.taskNotesBtn,
                              ...(task.notes?.trim() ? styles.taskNotesBtnActive : {}),
                            }}
                            aria-label={task.notes?.trim() ? 'Edit part notes' : 'Add part notes'}
                            title={task.notes?.trim() ? 'Part notes' : 'Add part notes'}
                          >
                            <NoteIcon active={Boolean(task.notes?.trim())} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!taskText) return;
                              setOpenLinksKey(null);
                              setNotesEditor(null);
                              setQuickstartTarget({
                                label: sessionLabel(projectName, taskText),
                                taskRef: { projectId: selected.id, taskId: task.id },
                              });
                            }}
                            style={{
                              ...styles.taskTimerBtn,
                              ...(!taskText ? styles.taskTimerBtnDisabled : {}),
                            }}
                            disabled={!taskText}
                            aria-label={taskText ? `Start timer for ${taskText}` : 'Add part text to start timer'}
                            title={taskText ? 'Start timer' : 'Add part text to start timer'}
                          >
                            <TimerStartIcon />
                          </button>
                          {taskIndex > 0 ? (
                            <button
                              type="button"
                              onClick={() => removeTask(selected.id, task.id)}
                              style={styles.taskRemove}
                              aria-label="Remove part"
                            >
                              ×
                            </button>
                          ) : (
                            <span style={styles.taskRemoveSpacer} aria-hidden />
                          )}
                        </div>
                        {subTasks.map((sub, subIndex) => {
                          const subText = sub.text.trim();
                          const subLinks = subTaskLinks(sub);
                          const linksKey = subLinksKey(task.id, sub.id);
                          return (
                          <div
                            key={sub.id}
                            draggable
                            data-drag-row=""
                            data-active-drag={
                              draggingSub?.subId === sub.id && draggingSub.taskId === task.id
                                ? 'true'
                                : undefined
                            }
                            style={{
                              ...styles.subTaskRow,
                              ...(draggingSub?.subId === sub.id && draggingSub.taskId === task.id
                                ? styles.subTaskRowDragging
                                : {}),
                              ...(subDrop?.taskId === task.id &&
                              subDrop.index === subIndex &&
                              draggingSub?.subId !== sub.id
                                ? styles.subTaskRowDropTarget
                                : {}),
                            }}
                            onDragStart={e => {
                              if (shouldBlockRowDrag(e.target)) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.setData(
                                SUBTASK_DRAG_TYPE,
                                JSON.stringify({ taskId: task.id, fromIndex: subIndex })
                              );
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggingSub({ taskId: task.id, subId: sub.id, fromIndex: subIndex });
                            }}
                            onDragEnd={clearSubDrag}
                            onDragOver={e => {
                              if (!draggingSub || draggingSub.taskId !== task.id) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setSubDrop({ taskId: task.id, index: subIndex });
                            }}
                            onDragLeave={e => {
                              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                              setSubDrop(prev =>
                                prev?.taskId === task.id && prev.index === subIndex ? null : prev
                              );
                            }}
                            onDrop={e => {
                              e.preventDefault();
                              const fromIndex =
                                draggingSub?.fromIndex ??
                                (() => {
                                  try {
                                    return JSON.parse(e.dataTransfer.getData(SUBTASK_DRAG_TYPE)).fromIndex as number;
                                  } catch {
                                    return null;
                                  }
                                })();
                              if (fromIndex !== null && fromIndex !== undefined && draggingSub?.taskId === task.id) {
                                reorderSubTasks(selected.id, task.id, fromIndex, subIndex);
                              }
                              clearSubDrag();
                            }}
                            title="Drag to reorder task"
                          >
                            <input
                              type="checkbox"
                              checked={sub.done}
                              onChange={e =>
                                updateSubTask(selected.id, task.id, sub.id, { done: e.target.checked })
                              }
                              style={styles.taskCheck}
                              aria-label="Mark task done"
                            />
                            <input
                              ref={el => {
                                const key = subTaskKey(task.id, sub.id);
                                if (el) subTaskInputRefs.current.set(key, el);
                                else subTaskInputRefs.current.delete(key);
                              }}
                              type="text"
                              value={sub.text}
                              onChange={e =>
                                updateSubTask(selected.id, task.id, sub.id, { text: e.target.value })
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const input = e.currentTarget;
                                  const cursor = input.selectionStart ?? input.value.length;
                                  splitSubTaskAfter(
                                    selected.id,
                                    task.id,
                                    sub.id,
                                    input.value.slice(0, cursor),
                                    input.value.slice(cursor)
                                  );
                                  return;
                                }
                                if (
                                  (e.key === 'Backspace' || e.key === 'Delete') &&
                                  !sub.text.trim()
                                ) {
                                  e.preventDefault();
                                  removeEmptySubTask(selected.id, task.id, sub.id, subIndex);
                                }
                              }}
                              placeholder=""
                              style={{
                                ...styles.subTaskInput,
                                ...(sub.done ? styles.taskInputDone : {}),
                              }}
                            />
                            <TaskContextLinksBox
                              links={subLinks}
                              compact
                              isOpen={openLinksKey === linksKey}
                              onToggle={() => {
                                setNotesEditor(null);
                                setOpenLinksKey(id => (id === linksKey ? null : linksKey));
                              }}
                              onClose={() => setOpenLinksKey(null)}
                              onAddLink={(url, name) =>
                                addSubTaskLink(selected.id, task.id, sub.id, url, name)
                              }
                              onRemoveLink={linkId =>
                                removeSubTaskLink(selected.id, task.id, sub.id, linkId)
                              }
                              onUpdateLinkName={(linkId, name) =>
                                updateSubTaskLinkName(selected.id, task.id, sub.id, linkId, name)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setOpenLinksKey(null);
                                setNotesEditor({
                                  kind: 'subTask',
                                  projectId: selected.id,
                                  taskId: task.id,
                                  subTaskId: sub.id,
                                });
                              }}
                              style={{
                                ...styles.subTaskActionBtn,
                                ...(sub.notes?.trim() ? styles.subTaskActionBtnActive : {}),
                              }}
                              aria-label={sub.notes?.trim() ? 'Edit task notes' : 'Add task notes'}
                              title={sub.notes?.trim() ? 'Task notes' : 'Add task notes'}
                            >
                              <NoteIcon active={Boolean(sub.notes?.trim())} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!subText) return;
                                setOpenLinksKey(null);
                                setNotesEditor(null);
                                setQuickstartTarget({
                                  label: sessionLabel(projectName, subText, taskText),
                                  taskRef: {
                                    projectId: selected.id,
                                    taskId: task.id,
                                    subTaskId: sub.id,
                                  },
                                });
                              }}
                              style={{
                                ...styles.subTaskActionBtn,
                                ...(!subText ? styles.subTaskActionBtnDisabled : {}),
                              }}
                              disabled={!subText}
                              aria-label={
                                subText ? `Start timer for ${subText}` : 'Add task text to start timer'
                              }
                              title={subText ? 'Start timer' : 'Add task text to start timer'}
                            >
                              <TimerStartIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSubTask(selected.id, task.id, sub.id)}
                              style={styles.subTaskRemove}
                              aria-label="Remove task"
                            >
                              ×
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={styles.editorFooter}>
                <div style={styles.editorFooterLeft}>
                  <button
                    type="button"
                    onClick={() => focusOrAppendTask(selected.id)}
                    style={styles.footerAddTaskBtn}
                  >
                    Add part
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesEditor({ kind: 'project', projectId: selected.id })}
                    style={{
                      ...styles.footerAddTaskBtn,
                      ...(selected.notes?.trim() ? styles.footerProjectNotesBtnActive : {}),
                    }}
                  >
                    {selected.notes?.trim() ? 'Project notes/context' : 'Add project notes/context'}
                  </button>
                </div>
                <button type="button" onClick={() => deleteProject(selected.id)} style={styles.deleteBtn}>
                  Delete thing
                </button>
              </div>
            </>
          ) : (
            <div style={styles.editorPlaceholder}>
              Select a project or click <strong>Add project</strong>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProjectsPanel;

const styles: Record<string, CSSProperties> = {
  root: { fontFamily: font, minHeight: 0 },
  split: {
    display: 'flex',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#fff',
    minHeight: 220,
  },
  sidebar: {
    width: 200,
    minWidth: 200,
    maxWidth: 200,
    flexShrink: 0,
    borderRight: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  sidebarEmpty: { padding: 14, fontSize: 12, color: '#94a3b8' },
  sidebarList: {
    overflowY: 'auto',
    maxHeight: 200,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sidebarItem: {
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: font,
  },
  sidebarItemActive: {
    background: '#fff',
    borderColor: '#e2e8f0',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
  sidebarItemName: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sidebarItemMeta: {
    display: 'block',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  editorPane: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 220,
  },
  nameBlock: { padding: '10px 14px 0' },
  nameInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: font,
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    padding: 0,
    marginBottom: 8,
    boxSizing: 'border-box',
  },
  tasksBlock: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    padding: '0 14px',
  },
  taskListTitle: {
    fontFamily: font,
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    marginTop: 4,
    marginBottom: 6,
  },
  taskListHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    flexShrink: 0,
    height: 11,
    marginBottom: -2,
  },
  taskCompletedLabel: {
    flexShrink: 0,
    width: 14,
    fontSize: 8,
    fontWeight: 500,
    fontFamily: font,
    color: '#94a3b8',
    letterSpacing: '0.01em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  taskList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: TASK_ROW_GAP_PX,
    height: TASK_LIST_SCROLL_HEIGHT,
    maxHeight: TASK_LIST_SCROLL_HEIGHT,
    flexShrink: 0,
  },
  pieceBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
    borderRadius: 4,
  },
  taskRowDragging: {
    opacity: 0.55,
    cursor: 'grabbing',
  },
  taskRowDropTarget: {
    boxShadow: 'inset 0 1px 0 rgba(148, 163, 184, 0.55)',
  },
  taskCheck: { flexShrink: 0, cursor: 'pointer' },
  taskInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: font,
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    padding: '4px 0',
    WebkitUserDrag: 'none',
  } as CSSProperties,
  taskInputDone: {
    color: '#94a3b8',
    textDecoration: 'line-through',
  },
  addSubTaskBtn: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 22,
    border: 'none',
    borderRadius: 6,
    background: '#f1f5f9',
    color: '#64748b',
    fontFamily: font,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 6px',
  },
  addSubTaskPlus: {
    fontSize: 14,
    fontWeight: 600,
  },
  addSubTaskLabel: {
    fontSize: 10,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  subTaskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 22,
    borderRadius: 4,
  },
  subTaskRowDragging: {
    opacity: 0.55,
    cursor: 'grabbing',
  },
  subTaskRowDropTarget: {
    boxShadow: 'inset 0 1px 0 rgba(148, 163, 184, 0.55)',
  },
  subTaskInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: font,
    fontSize: 12,
    fontWeight: 400,
    color: '#64748b',
    padding: '2px 0',
    WebkitUserDrag: 'none',
  } as CSSProperties,
  subTaskActionBtn: {
    flexShrink: 0,
    width: 22,
    height: 22,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  subTaskActionBtnActive: {
    color: '#6366f1',
  },
  subTaskActionBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  subTaskRemove: {
    flexShrink: 0,
    width: 20,
    height: 20,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  },
  taskNotesBtn: {
    flexShrink: 0,
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  taskNotesBtnActive: {
    color: '#6366f1',
  },
  taskTimerBtn: {
    flexShrink: 0,
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  taskTimerBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  taskRemove: {
    flexShrink: 0,
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 16,
    cursor: 'pointer',
    lineHeight: 1,
  },
  taskRemoveSpacer: {
    flexShrink: 0,
    width: 24,
    height: 24,
  },
  editorFooter: {
    padding: '6px 14px 10px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  editorFooterLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  footerAddTaskBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    background: '#f8fafc',
    color: '#334155',
    cursor: 'pointer',
  },
  footerProjectNotesBtnActive: {
    borderColor: '#c7d2fe',
    background: '#eef2ff',
    color: '#4338ca',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: font,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  editorPlaceholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
};
