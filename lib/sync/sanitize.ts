import type { AppleNote, ProjectBoard, ProjectSubTask, ProjectTask, TaskContextLink } from '@/components/agent-hq/types';

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

export function sanitizeNotesForCloud(notes: AppleNote[]): AppleNote[] {
  return notes.map(note => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }));
}

export function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
