import type { ProjectBoard } from './types';
import { appendStructuredTaskNote } from './nightPrep/utils';

export type NoteClipTarget =
  | { kind: 'project'; projectId: string }
  | { kind: 'task'; projectId: string; taskId: string }
  | { kind: 'subTask'; projectId: string; taskId: string; subTaskId: string };

export function formatNoteClipEntry(sourceLabel: string, text: string): string {
  const trimmed = text.trim();
  const stamp = `[From ${sourceLabel.trim()}]`;
  return `${stamp}\n${trimmed}`;
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
      target: { kind: 'project', projectId: project.id },
    },
  ];

  for (const task of project.tasks) {
    const partLabel = taskLabel(task.text, 'Untitled part');
    options.push({
      key: `task:${task.id}`,
      label: `Part · ${partLabel}`,
      target: { kind: 'task', projectId: project.id, taskId: task.id },
    });

    for (const sub of task.subTasks ?? []) {
      const subLabel = taskLabel(sub.text, 'Untitled task');
      options.push({
        key: `sub:${task.id}:${sub.id}`,
        label: `  ↳ ${subLabel}`,
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
