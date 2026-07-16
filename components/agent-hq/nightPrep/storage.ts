import { nightPrepTargetDateKey } from './utils';
import { localDateKey } from '../eodReports';

export const NIGHT_PREP_PLAN_KEY = 'agentHQ_nightPrepPlan';

export interface NightPrepTomorrowTask {
  projectId: string;
  projectName: string;
  taskId: string;
  taskText: string;
}

export interface NightPrepTomorrowPlan {
  prepDateKey: string;
  targetDateKey: string;
  firstWorkBlockTime: string;
  firstWorkBlockMinutes: number | null;
  workLocation: string;
  tasks: NightPrepTomorrowTask[];
  updatedAt: number;
  /** @deprecated legacy test promotion flag */
  testMode?: boolean;
  /** @deprecated migrated to tasks[] */
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskText?: string;
}

export function normalizeNightPrepPlan(
  plan: NightPrepTomorrowPlan | null
): NightPrepTomorrowPlan | null {
  if (!plan) return null;
  if (plan.tasks?.length) return plan;
  if (plan.taskText?.trim() && plan.projectId && plan.taskId) {
    return {
      ...plan,
      tasks: [
        {
          projectId: plan.projectId,
          projectName: plan.projectName?.trim() || '',
          taskId: plan.taskId,
          taskText: plan.taskText.trim(),
        },
      ],
    };
  }
  return { ...plan, tasks: [] };
}

export function buildNightPrepPlan(fields: {
  firstWorkBlockTime: string;
  firstWorkBlockMinutes: number | null;
  workLocation: string;
  tasks: NightPrepTomorrowTask[];
}): NightPrepTomorrowPlan {
  const now = Date.now();
  const tasks = fields.tasks.filter(t => t.taskText.trim());
  const primary = tasks[0];
  return {
    prepDateKey: localDateKey(now),
    targetDateKey: nightPrepTargetDateKey(now),
    firstWorkBlockTime: fields.firstWorkBlockTime.trim(),
    firstWorkBlockMinutes: fields.firstWorkBlockMinutes,
    workLocation: fields.workLocation.trim(),
    tasks,
    updatedAt: now,
    projectId: primary?.projectId,
    projectName: primary?.projectName,
    taskId: primary?.taskId,
    taskText: primary?.taskText,
  };
}

export function readNightPrepPlan(): NightPrepTomorrowPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NIGHT_PREP_PLAN_KEY);
    if (!raw) return null;
    return normalizeNightPrepPlan(JSON.parse(raw) as NightPrepTomorrowPlan);
  } catch {
    return null;
  }
}

export function formatNightPrepPlanSummary(plan: NightPrepTomorrowPlan): string {
  const normalized = normalizeNightPrepPlan(plan);
  if (!normalized) return '';
  const taskPart = normalized.tasks.map(t => t.taskText.trim()).filter(Boolean).join(' · ');
  const parts = [taskPart];
  if (normalized.workLocation.trim()) parts.push(`@ ${normalized.workLocation.trim()}`);
  if (normalized.firstWorkBlockTime.trim()) parts.push(`(${normalized.firstWorkBlockTime.trim()})`);
  return parts.filter(Boolean).join(' ');
}

export function isNightPrepPlanActiveToday(
  plan: NightPrepTomorrowPlan | null,
  now = Date.now()
): boolean {
  return getActiveNightPrepPlan(plan, now) !== null;
}

function previousDateKey(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return localDateKey(d.getTime());
}

/** Plan for today, or still valid before 5am if it was for yesterday. */
export function getActiveNightPrepPlan(
  plan: NightPrepTomorrowPlan | null,
  now = Date.now()
): NightPrepTomorrowPlan | null {
  const normalized = normalizeNightPrepPlan(plan);
  if (!normalized) return null;

  const today = localDateKey(now);
  if (normalized.targetDateKey === today) return normalized;

  const d = new Date(now);
  if (d.getHours() < 5 && normalized.targetDateKey === previousDateKey(today)) {
    return normalized;
  }

  return null;
}
