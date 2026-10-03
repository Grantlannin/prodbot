import type { CaptureNote, SimpleNote, ProjectBoard, ProjectSubTask, ProjectTask, TaskContextLink } from '@/components/agent-hq/types';
import type { NightPrepTomorrowPlan } from '@/components/agent-hq/nightPrep/storage';
import { normalizeNightPrepPlan } from '@/components/agent-hq/nightPrep/storage';
import type { TodayTaskListStore } from '@/components/agent-hq/todayTaskList/storage';
import { normalizeTodayTaskList } from '@/components/agent-hq/todayTaskList/storage';

function sanitizeLinks(links: TaskContextLink[] | undefined): TaskContextLink[] {
  return (links ?? []).map(link => ({
    id: link.id,
    url: link.url,
    ...(link.name?.trim() ? { name: link.name.trim() } : {}),
    createdAt: link.createdAt,
  }));
}

function sanitizeSubTask(sub: ProjectSubTask): ProjectSubTask {
  return {
    id: sub.id,
    text: sub.text,
    done: sub.done,
    createdAt: sub.createdAt,
    ...(sub.notes !== undefined ? { notes: sub.notes } : {}),
    contextLinks: sanitizeLinks(sub.contextLinks),
  };
}

function sanitizeTask(task: ProjectTask): ProjectTask {
  return {
    id: task.id,
    text: task.text,
    done: task.done,
    createdAt: task.createdAt,
    ...(task.notes !== undefined ? { notes: task.notes } : {}),
    contextLinks: sanitizeLinks(task.contextLinks),
    subTasks: (task.subTasks ?? []).map(sanitizeSubTask),
  };
}

export function sanitizeProjectsForCloud(projects: ProjectBoard[]): ProjectBoard[] {
  return projects.map(project => ({
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    ...(project.notes !== undefined ? { notes: project.notes } : {}),
    tasks: project.tasks.map(sanitizeTask),
  }));
}

export function sanitizeNotesForCloud(notes: SimpleNote[]): SimpleNote[] {
  return notes.map(note => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }));
}

export function sanitizeOpenLoopsForCloud(notes: CaptureNote[]): CaptureNote[] {
  return (notes ?? [])
    .filter(note => note && typeof note.id === 'string')
    .map(note => ({
      id: note.id,
      title: typeof note.title === 'string' ? note.title : '',
      body: typeof note.body === 'string' ? note.body : '',
      createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now(),
      updatedAt: typeof note.updatedAt === 'number' ? note.updatedAt : Date.now(),
      ...(note.kind === 'decision' || note.kind === 'open_loop' ? { kind: note.kind } : {}),
      ...(typeof note.sortOrder === 'number' ? { sortOrder: note.sortOrder } : {}),
      ...(typeof note.loopSortOrder === 'number' ? { loopSortOrder: note.loopSortOrder } : {}),
      ...(typeof note.decisionSortOrder === 'number'
        ? { decisionSortOrder: note.decisionSortOrder }
        : {}),
    }));
}

export function sanitizeNightPrepPlanForCloud(
  plan: NightPrepTomorrowPlan | null
): NightPrepTomorrowPlan | null {
  const normalized = normalizeNightPrepPlan(plan);
  if (!normalized) return null;
  return {
    prepDateKey: normalized.prepDateKey,
    targetDateKey: normalized.targetDateKey,
    firstWorkBlockTime: normalized.firstWorkBlockTime ?? '',
    firstWorkBlockMinutes:
      typeof normalized.firstWorkBlockMinutes === 'number' ? normalized.firstWorkBlockMinutes : null,
    workLocation: normalized.workLocation ?? '',
    tasks: (normalized.tasks ?? []).map(task => ({
      projectId: task.projectId,
      projectName: task.projectName,
      taskId: task.taskId,
      taskText: task.taskText,
    })),
    updatedAt: typeof normalized.updatedAt === 'number' ? normalized.updatedAt : Date.now(),
    ...(normalized.projectId ? { projectId: normalized.projectId } : {}),
    ...(normalized.projectName ? { projectName: normalized.projectName } : {}),
    ...(normalized.taskId ? { taskId: normalized.taskId } : {}),
    ...(normalized.taskText ? { taskText: normalized.taskText } : {}),
  };
}

export function sanitizeMiscTaskListForCloud(store: TodayTaskListStore): TodayTaskListStore {
  return normalizeTodayTaskList(store);
}

export function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
