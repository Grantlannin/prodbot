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
  /** Dev/testing: plan was promoted to today so morning flow can be tested immediately */
  testMode?: boolean;
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

export function isNightPrepPlanActiveToday(
  plan: NightPrepTomorrowPlan | null,
  now = Date.now()
): boolean {
  if (!plan) return false;
  return plan.targetDateKey === localDateKey(now);
}

/** Plan saved last night for today, or promoted via test mode */
export function getActiveNightPrepPlan(
  plan: NightPrepTomorrowPlan | null,
  now = Date.now()
): NightPrepTomorrowPlan | null {
  if (!plan) return null;
  return isNightPrepPlanActiveToday(plan, now) ? plan : null;
}

export function promoteNightPrepPlanToToday(
  plan: NightPrepTomorrowPlan,
  now = Date.now()
): NightPrepTomorrowPlan {
  return {
    ...plan,
    targetDateKey: localDateKey(now),
    testMode: true,
    updatedAt: now,
  };
}
