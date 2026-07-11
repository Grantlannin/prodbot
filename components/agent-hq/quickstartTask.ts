import type { ProjectBoard, ProjectTask } from './types';

export interface ListedWorkTask {
  projectId: string;
  projectName: string;
  taskId: string;
  subTaskId?: string;
  taskText: string;
  partText?: string;
  label: string;
  kind: 'part' | 'subTask';
}

export interface WorkPartGroup {
  projectId: string;
  projectName: string;
  part: ListedWorkTask;
  subTasks: ListedWorkTask[];
}

function projectDisplayName(project: ProjectBoard): string {
  return project.name.trim() || 'Untitled project';
}

function partListedTask(project: ProjectBoard, task: ProjectTask): ListedWorkTask | null {
  if (task.done || !task.text.trim()) return null;
  const projectName = projectDisplayName(project);
  const taskText = task.text.trim();
  return {
    projectId: project.id,
    projectName,
    taskId: task.id,
    taskText,
    partText: taskText,
    label: sessionLabel(projectName, taskText),
    kind: 'part',
  };
}

function subTaskListedTask(
  project: ProjectBoard,
  task: ProjectTask,
  sub: NonNullable<ProjectTask['subTasks']>[number]
): ListedWorkTask | null {
  if (sub.done || !sub.text.trim()) return null;
  const projectName = projectDisplayName(project);
  const partText = task.text.trim();
  const taskText = sub.text.trim();
  return {
    projectId: project.id,
    projectName,
    taskId: task.id,
    subTaskId: sub.id,
    taskText,
    partText,
    label: sessionLabel(projectName, taskText, partText),
    kind: 'subTask',
  };
}

export function listWorkPartGroups(projects: ProjectBoard[]): WorkPartGroup[] {
  const out: WorkPartGroup[] = [];
  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const project of sorted) {
    const projectName = projectDisplayName(project);
    for (const task of project.tasks) {
      const part = partListedTask(project, task);
      if (!part) continue;
      const subTasks = (task.subTasks ?? [])
        .map(sub => subTaskListedTask(project, task, sub))
        .filter((entry): entry is ListedWorkTask => entry !== null);
      out.push({ projectId: project.id, projectName, part, subTasks });
    }
  }

  return out;
}

export function listWorkTasks(projects: ProjectBoard[]): ListedWorkTask[] {
  const out: ListedWorkTask[] = [];
  for (const group of listWorkPartGroups(projects)) {
    out.push(group.part);
    out.push(...group.subTasks);
  }
  return out;
}

export function sessionLabel(_projectName: string, taskText: string, partText?: string): string {
  const text = taskText.trim();
  const part = partText?.trim();
  if (part && part !== text) return `${part} — ${text}`;
  return text;
}

export function makeProjectTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function appendTaskNotesInProjects(
  projects: ProjectBoard[],
  projectId: string,
  taskId: string,
  addition: string
): ProjectBoard[] {
  const add = addition.trim();
  if (!add) return projects;

  return projects.map(project => {
    if (project.id !== projectId) return project;
    return {
      ...project,
      tasks: project.tasks.map(task => {
        if (task.id !== taskId) return task;
        const existing = task.notes?.trim();
        const notes = existing ? `${existing}\n\n${add}` : add;
        return { ...task, notes };
      }),
      updatedAt: Date.now(),
    };
  });
}

export function findListedTask(
  projects: ProjectBoard[],
  projectId: string,
  taskId: string,
  subTaskId?: string
): ListedWorkTask | null {
  return (
    listWorkTasks(projects).find(
      t =>
        t.projectId === projectId &&
        t.taskId === taskId &&
        (subTaskId ? t.subTaskId === subTaskId : t.kind === 'part')
    ) ?? null
  );
}

export function newProjectTask(text: string): ProjectTask {
  return {
    id: makeProjectTaskId(),
    text,
    done: false,
    createdAt: Date.now(),
    contextLinks: [],
  };
}
