import { tomorrowDateKey } from './utils';
import { localDateKey } from '../eodReports';

export const NIGHT_PREP_PLAN_KEY = 'agentHQ_nightPrepPlan';

export interface NightPrepTomorrowPlan {
  prepDateKey: string;
  targetDateKey: string;
  firstWorkBlockTime: string;
  firstWorkBlockMinutes: number | null;
  workLocation: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskText: string;
  updatedAt: number;
}

export function buildNightPrepPlan(fields: {
  firstWorkBlockTime: string;
  firstWorkBlockMinutes: number | null;
  workLocation: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskText: string;
}): NightPrepTomorrowPlan {
  const now = Date.now();
  return {
    prepDateKey: localDateKey(now),
    targetDateKey: tomorrowDateKey(now),
    firstWorkBlockTime: fields.firstWorkBlockTime.trim(),
    firstWorkBlockMinutes: fields.firstWorkBlockMinutes,
    workLocation: fields.workLocation.trim(),
    projectId: fields.projectId,
    projectName: fields.projectName.trim(),
    taskId: fields.taskId,
    taskText: fields.taskText.trim(),
    updatedAt: now,
  };
}

export function readNightPrepPlan(): NightPrepTomorrowPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NIGHT_PREP_PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NightPrepTomorrowPlan;
  } catch {
    return null;
  }
}

export function formatNightPrepPlanSummary(plan: NightPrepTomorrowPlan): string {
  const parts = [plan.taskText.trim()];
  if (plan.workLocation.trim()) parts.push(`@ ${plan.workLocation.trim()}`);
  if (plan.firstWorkBlockTime.trim()) parts.push(`(${plan.firstWorkBlockTime.trim()})`);
  return parts.join(' ');
}
