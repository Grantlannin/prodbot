import type { ProjectBoard } from './types';
import { appendStructuredTaskNote } from './nightPrep/utils';

export type NoteClipTarget =
  | { kind: 'project'; projectId: string }
  | { kind: 'task'; projectId: string; taskId: string }
  | { kind: 'subTask'; projectId: string; taskId: string; subTaskId: string };

export function formatClipDateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

function formatClipBoldLine(line: string): string {
  return `**${line.trim()}**`;
}

export function formatNoteClipEntry(options: {
  text: string;
  dateMs?: number;
  context?: string;
}): string {
  const trimmed = options.text.trim();
  const dateLabel = formatClipDateLabel(options.dateMs ?? Date.now());
  const lines = [formatClipBoldLine(dateLabel)];

  const context = options.context?.trim();
  if (context) lines.push(formatClipBoldLine(context));

  lines.push(trimmed);
  return lines.join('\n');
}

export function applyNoteClip(
  projects: ProjectBoard[],
  target: NoteClipTarget,
  entry: string
): ProjectBoard[] {
  const add = entry.trim();
  if (!add) return projects;

  return projects.map(project => {
    if (project.id !== target.projectId) return project;

    if (target.kind === 'project') {
      return {
        ...project,
        updatedAt: Date.now(),
        notes: appendStructuredTaskNote(project.notes, add),
      };
    }

    if (target.kind === 'task') {
      return {
        ...project,
        updatedAt: Date.now(),
        tasks: project.tasks.map(task =>
          task.id !== target.taskId
            ? task
            : { ...task, notes: appendStructuredTaskNote(task.notes, add) }
        ),
      };
    }

    return {
      ...project,
      updatedAt: Date.now(),
      tasks: project.tasks.map(task => {
        if (task.id !== target.taskId) return task;
        return {
          ...task,
          subTasks: task.subTasks?.map(sub =>
            sub.id !== target.subTaskId
              ? sub
              : { ...sub, notes: appendStructuredTaskNote(sub.notes, add) }
          ),
        };
      }),
    };
  });
}

export interface NoteClipSectionOption {
  key: string;
  label: string;
  tier: 'project' | 'part' | 'task';
  target: NoteClipTarget;
}

function taskLabel(text: string, fallback: string): string {
  const trimmed = text.trim();
  return trimmed || fallback;
}

export function listNoteClipSections(project: ProjectBoard): NoteClipSectionOption[] {
  const options: NoteClipSectionOption[] = [
    {
      key: 'project',
      label: 'Project notes',
      tier: 'project',
      target: { kind: 'project', projectId: project.id },
    },
  ];

  for (const task of project.tasks) {
    const partText = task.text.trim();
    const subs = task.subTasks ?? [];

    if (partText) {
      options.push({
        key: `task:${task.id}`,
        label: partText,
        tier: 'part',
        target: { kind: 'task', projectId: project.id, taskId: task.id },
      });
    }

    for (const sub of subs) {
      const subLabel = taskLabel(sub.text, 'Untitled');
      options.push({
        key: `sub:${task.id}:${sub.id}`,
        label: subLabel,
        tier: 'task',
        target: {
          kind: 'subTask',
          projectId: project.id,
          taskId: task.id,
          subTaskId: sub.id,
        },
      });
    }
  }

  return options;
}
