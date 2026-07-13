import type { ProjectBoard, ProjectTask } from '../types';

export const PROJECTS_STORAGE_KEY = 'agentHQ_projects';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createProjectBoard(name: string): ProjectBoard {
  const now = Date.now();
  return {
    id: makeId(),
    name: name.trim(),
    tasks: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createProjectTask(text: string): ProjectTask {
  return {
    id: makeId(),
    text: text.trim(),
    done: false,
    createdAt: Date.now(),
  };
}

export function addProjectTask(
  projects: ProjectBoard[],
  projectId: string,
  taskText: string
): ProjectBoard[] {
  const task = createProjectTask(taskText);
  if (!task.text) return projects;
  return projects.map(p =>
    p.id === projectId ? { ...p, tasks: [...p.tasks, task], updatedAt: Date.now() } : p
  );
}

export function upsertProject(
  projects: ProjectBoard[],
  name: string
): { projects: ProjectBoard[]; project: ProjectBoard } {
  const trimmed = name.trim();
  const existing = projects.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return { projects, project: existing };
  const project = createProjectBoard(trimmed);
  return { projects: [project, ...projects], project };
}

export function getOpenProjectTaskTexts(project: ProjectBoard | undefined): string[] {
  if (!project) return [];
  return project.tasks
    .filter(task => !task.done && task.text.trim())
    .map(task => task.text.trim());
}

export function mergeTaskTextOptions(projectTasks: string[], chatTasks: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const task of [...projectTasks, ...chatTasks]) {
    const trimmed = task.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    merged.push(trimmed);
  }
  return merged;
}
