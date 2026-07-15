import type { DoneTodayItem, ProjectBoard } from '../types';
import { formatReportDateLabel, localDateKey } from '../eodReports';
import { parseFlexibleTime } from '../stuckHelp/dailyStructureUtils';

export function formatWindDownNoteEntry(dateKey: string, context: string): string {
  const label = formatReportDateLabel(dateKey);
  return `[Wind down · ${label}]\n${context.trim()}`;
}

export function appendStructuredTaskNote(existing: string | undefined, entry: string): string {
  const prev = existing?.trim();
  return prev ? `${prev}\n\n${entry}` : entry;
}

export function resolveDoneItemTaskTargets(
  projects: ProjectBoard[],
  item: DoneTodayItem
): { projectId: string; taskId: string }[] {
  if (item.projectId) {
    const project = projects.find(p => p.id === item.projectId);
    if (!project) return [];

    const taskNames =
      item.detail
        ?.split('·')
        .map(s => s.trim())
        .filter(Boolean) ?? [];

    if (taskNames.length) {
      const targets: { projectId: string; taskId: string }[] = [];
      for (const name of taskNames) {
        const task = project.tasks.find(t => t.text.trim().toLowerCase() === name.toLowerCase());
        if (task) targets.push({ projectId: item.projectId, taskId: task.id });
      }
      return targets;
    }

    const doneTasks = project.tasks.filter(t => t.done && t.text.trim());
    return doneTasks.map(t => ({ projectId: item.projectId!, taskId: t.id }));
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

export function appendWindDownContextToProjects(
  projects: ProjectBoard[],
  item: DoneTodayItem,
  context: string,
  dateKey = localDateKey()
): ProjectBoard[] {
  const entry = formatWindDownNoteEntry(dateKey, context);
  const targets = resolveDoneItemTaskTargets(projects, item);
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
