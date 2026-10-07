import type { ProjectBoard } from '../types';
import { formatReportDateLabel, localDateKey } from '../eodReports';
import { parseFlexibleTime } from '../stuckHelp/dailyStructureUtils';
import { parseNoteTabs, serializeNoteTabs } from '../noteFormatUtils';
import type { WindDownItem } from './windDownItems';

export function formatWindDownNoteEntry(dateKey: string, context: string): string {
  const label = formatReportDateLabel(dateKey);
  return `[Wind down · ${label}]\n${context.trim()}`;
}

function appendToNoteBody(prev: string, add: string): string {
  const existing = prev.trim();
  if (!existing) return add;
  // Rich notes are stored as HTML — append as new block lines.
  if (/<[a-z][\s\S]*>/i.test(existing)) {
    const escaped = add
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => {
        const bold = line.match(/^\*\*(.+)\*\*$/);
        if (bold) return `<div><strong>${bold[1]}</strong></div>`;
        return `<div>${line || '<br>'}</div>`;
      })
      .join('');
    return `${existing}${escaped}`;
  }
  return `${existing}\n\n${add}`;
}

export function appendStructuredTaskNote(existing: string | undefined, entry: string): string {
  const add = entry.trim();
  if (!add) return existing ?? '';
  const state = parseNoteTabs(existing);
  const idx = Math.max(
    0,
    state.tabs.findIndex(t => t.id === state.activeId)
  );
  const tabs = state.tabs.map((t, i) =>
    i === idx ? { ...t, body: appendToNoteBody(t.body, add) } : t
  );
  return serializeNoteTabs({ tabs, activeId: state.activeId });
}

type WindDownNoteTarget = {
  projectId: string;
  taskId: string;
  /** When set, append to that subtask's notes (same target as "add from notes"). */
  subTaskId?: string;
};

function applyNoteToTaskTargets(
  projects: ProjectBoard[],
  targets: WindDownNoteTarget[],
  entry: string
): ProjectBoard[] {
  if (!targets.length) return projects;

  return projects.map(project => {
    const projectTargets = targets.filter(t => t.projectId === project.id);
    if (!projectTargets.length) return project;

    return {
      ...project,
      updatedAt: Date.now(),
      tasks: project.tasks.map(task => {
        const forTask = projectTargets.filter(t => t.taskId === task.id);
        if (!forTask.length) return task;

        let next = task;
        for (const t of forTask) {
          if (t.subTaskId) {
            next = {
              ...next,
              subTasks: (next.subTasks ?? []).map(sub =>
                sub.id !== t.subTaskId
                  ? sub
                  : { ...sub, notes: appendStructuredTaskNote(sub.notes, entry) }
              ),
            };
          } else {
            next = {
              ...next,
              notes: appendStructuredTaskNote(next.notes, entry),
            };
          }
        }
        return next;
      }),
    };
  });
}

function resolveTrackerTaskTargets(
  projects: ProjectBoard[],
  trackerLabel: string
): WindDownNoteTarget[] {
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
        // Subtask sessions use "Part — Sub" — write to the subtask notes, not the part.
        return [{ projectId: project.id, taskId: task.id, subTaskId: sub.id }];
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
