import type { DoneTodayItem, ProjectBoard } from '../types';
import { formatReportDateLabel, localDateKey } from '../eodReports';
import { parseFlexibleTime } from '../stuckHelp/dailyStructureUtils';
import type { WindDownItem } from './windDownItems';

export function formatWindDownNoteEntry(dateKey: string, context: string): string {
  const label = formatReportDateLabel(dateKey);
  return `[Wind down · ${label}]\n${context.trim()}`;
}

export function appendStructuredTaskNote(existing: string | undefined, entry: string): string {
  const prev = existing?.trim();
  return prev ? `${prev}\n\n${entry}` : entry;
}

function applyNoteToTaskTargets(
  projects: ProjectBoard[],
  targets: { projectId: string; taskId: string }[],
  entry: string
): ProjectBoard[] {
  if (!targets.length) return projects;
  const targetSet = new Set(targets.map(t => `${t.projectId}:${t.taskId}`));

  return projects.map(project => {
    const projectTargets = targets.filter(t => t.projectId === project.id);
    if (!projectTargets.length) return project;

    return {
      ...project,
      updatedAt: Date.now(),
      tasks: project.tasks.map(task => {
        const key = `${project.id}:${task.id}`;
        if (!targetSet.has(key)) return task;
        return {
          ...task,
          notes: appendStructuredTaskNote(task.notes, entry),
        };
      }),
    };
  });
}

export function resolveDoneItemTaskTargets(
  projects: ProjectBoard[],
  item: DoneTodayItem
): { projectId: string; taskId: string }[] {
  if (item.projectId) {
    const project = projects.find(p => p.id === item.projectId);
    if (!project) return [];

    const trimmed = item.text.trim();
    if (trimmed) {
      const task = project.tasks.find(t => t.text.trim().toLowerCase() === trimmed.toLowerCase());
      if (task) return [{ projectId: item.projectId, taskId: task.id }];
    }

    const detail = item.detail?.trim();
    if (detail && !detail.includes('·')) {
      const task = project.tasks.find(t => t.text.trim().toLowerCase() === detail.toLowerCase());
      if (task) return [{ projectId: item.projectId, taskId: task.id }];
    }

    return [];
  }

  const trimmed = item.text.trim().toLowerCase();
  if (!trimmed) return [];

  const targets: { projectId: string; taskId: string }[] = [];
  for (const project of projects) {
    const task = project.tasks.find(t => t.text.trim().toLowerCase() === trimmed);
    if (task) targets.push({ projectId: project.id, taskId: task.id });
  }
  return targets;
}

function resolveTrackerTaskTargets(
  projects: ProjectBoard[],
  trackerLabel: string
): { projectId: string; taskId: string }[] {
  const trimmed = trackerLabel.trim();
  if (!trimmed) return [];

  const dash = trimmed.indexOf(' — ');
  if (dash >= 0) {
    const partText = trimmed.slice(0, dash).trim();
    const subText = trimmed.slice(dash + 3).trim();
    if (!partText) return [];

    for (const project of projects) {
      const task = project.tasks.find(t => t.text.trim().toLowerCase() === partText.toLowerCase());
      if (!task) continue;
      if (subText) {
        const sub = task.subTasks?.find(s => s.text.trim().toLowerCase() === subText.toLowerCase());
        if (!sub) continue;
      }
      return [{ projectId: project.id, taskId: task.id }];
    }
    return [];
  }

  const name = trimmed.toLowerCase();
  for (const project of projects) {
    const task = project.tasks.find(t => t.text.trim().toLowerCase() === name);
    if (task) return [{ projectId: project.id, taskId: task.id }];
  }
  return [];
}

export function appendWindDownContextToProjects(
  projects: ProjectBoard[],
  item: WindDownItem,
  context: string,
  dateKey = localDateKey()
): ProjectBoard[] {
  const entry = formatWindDownNoteEntry(dateKey, context);

  if (item.source === 'done_today' && item.doneTodayItem) {
    const targets = resolveDoneItemTaskTargets(projects, item.doneTodayItem);
    return applyNoteToTaskTargets(projects, targets, entry);
  }

  const taskTargets = resolveTrackerTaskTargets(projects, item.label.trim());
  if (taskTargets.length) {
    return applyNoteToTaskTargets(projects, taskTargets, entry);
  }

  return projects;
}

export function parseTomorrowTimeLabel(value: string): string {
  return value.trim();
}

export function parseTomorrowTimeMinutes(value: string): number | null {
  return parseFlexibleTime(value.trim());
}

export function tomorrowDateKey(now = Date.now()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return localDateKey(d.getTime());
}
