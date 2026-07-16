import { localDateKey } from '../eodReports';
import type { NightPrepTomorrowPlan } from '../nightPrep/storage';
import { getActiveNightPrepPlan } from '../nightPrep/storage';

export const MORNING_FLOW_USED_KEY = 'agentHQ_morningFlowUsed';

export interface MorningFlowUsedRecord {
  dateKey: string;
  planUpdatedAt: number;
}

export function parseMorningFlowUsed(
  stored: MorningFlowUsedRecord | string | null
): MorningFlowUsedRecord | null {
  if (!stored) return null;
  if (typeof stored === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
      return { dateKey: stored, planUpdatedAt: 0 };
    }
    return null;
  }
  if (stored.dateKey) return stored;
  return null;
}

/** True when begin work was already completed for today's active plan. */
export function isMorningFlowUsedForActivePlan(
  stored: MorningFlowUsedRecord | string | null,
  plan: NightPrepTomorrowPlan | null,
  now = Date.now()
): boolean {
  const used = parseMorningFlowUsed(stored);
  const active = getActiveNightPrepPlan(plan, now);
  if (!used || !active) return false;
  if (used.dateKey !== localDateKey(now)) return false;
  return used.planUpdatedAt === active.updatedAt;
}

export function buildMorningFlowUsedRecord(
  plan: NightPrepTomorrowPlan,
  now = Date.now()
): MorningFlowUsedRecord {
  return {
    dateKey: localDateKey(now),
    planUpdatedAt: plan.updatedAt,
  };
}
