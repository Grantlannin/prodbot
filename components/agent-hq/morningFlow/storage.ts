import { localDateKey } from '../eodReports';

export const MORNING_FLOW_USED_KEY = 'agentHQ_morningFlowUsed';
export const MORNING_FLOW_TEST_MODE_KEY = 'agentHQ_morningFlowTestMode';

export function isMorningFlowUsedToday(usedDateKey: string | null, now = Date.now()): boolean {
  return usedDateKey === localDateKey(now);
}

export function morningFlowUsedDateKey(now = Date.now()): string {
  return localDateKey(now);
}
