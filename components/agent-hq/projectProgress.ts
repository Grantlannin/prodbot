import type { ProjectTask } from './types';

export interface ProjectProgress {
  /** 0–100 */
  percent: number;
  done: number;
  total: number;
}

/** Progress from tasks with non-empty text only */
export function getProjectProgress(tasks: ProjectTask[]): ProjectProgress {
  const countable = tasks.filter(t => t.text.trim().length > 0);
  const total = countable.length;
  if (total === 0) return { percent: 0, done: 0, total: 0 };
  const done = countable.filter(t => t.done).length;
  return { percent: Math.round((done / total) * 100), done, total };
}
