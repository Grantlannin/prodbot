import type { ProjectTask } from './types';

export interface ProjectProgress {
  /** 0–100 */
  percent: number;
  done: number;
  total: number;
}

/**
 * Progress from real work items only:
 * - parts with sub-tasks → each non-empty sub-task counts
 * - parts without sub-tasks → the part itself counts
 */
export function getProjectProgress(tasks: ProjectTask[]): ProjectProgress {
  let done = 0;
  let total = 0;

  for (const task of tasks) {
    if (!task.text.trim()) continue;
    const subs = (task.subTasks ?? []).filter(st => st.text.trim().length > 0);
    if (subs.length > 0) {
      total += subs.length;
      done += subs.filter(st => st.done).length;
    } else {
      total += 1;
      if (task.done) done += 1;
    }
  }

  if (total === 0) return { percent: 0, done: 0, total: 0 };
  return { percent: Math.round((done / total) * 100), done, total };
}
