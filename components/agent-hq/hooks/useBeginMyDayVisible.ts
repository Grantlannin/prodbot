'use client';

import { useEffect, useMemo, useState } from 'react';
import { localDateKey } from '../eodReports';
import { NIGHT_PREP_PLAN_KEY, type NightPrepTomorrowPlan } from '../nightPrep/storage';
import { getActiveNightPrepPlan } from '../nightPrep/storage';
import {
  isMorningFlowUsedForActivePlan,
  MORNING_FLOW_USED_KEY,
  type MorningFlowUsedRecord,
} from '../morningFlow/storage';
import { useLocalStorage } from './useLocalStorage';

function msUntilNextLocalMidnight(now = Date.now()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now) + 50;
}

export function useBeginMyDayVisible(): boolean {
  const [plan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);
  const [used] = useLocalStorage<MorningFlowUsedRecord | string | null>(MORNING_FLOW_USED_KEY, null);
  const [todayKey, setTodayKey] = useState(() => localDateKey());

  useEffect(() => {
    const refresh = () => setTodayKey(localDateKey());

    let midnightTimer: number | undefined;

    const scheduleMidnightRefresh = () => {
      midnightTimer = window.setTimeout(() => {
        refresh();
        scheduleMidnightRefresh();
      }, msUntilNextLocalMidnight());
    };

    refresh();
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(refresh, 60_000);
    scheduleMidnightRefresh();

    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(interval);
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
    };
  }, []);

  return useMemo(() => {
    if (isMorningFlowUsedForActivePlan(used, plan)) return false;
    const active = getActiveNightPrepPlan(plan);
    return Boolean(active?.tasks?.length);
  }, [plan, used, todayKey]);
}
