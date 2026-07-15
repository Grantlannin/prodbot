'use client';

import { useEffect, useMemo, useState } from 'react';
import { localDateKey } from '../eodReports';
import { getActiveNightPrepPlan, NIGHT_PREP_PLAN_KEY, type NightPrepTomorrowPlan } from '../nightPrep/storage';
import { isMorningFlowUsedToday, MORNING_FLOW_USED_KEY } from '../morningFlow/storage';
import { useLocalStorage } from './useLocalStorage';

export function useBeginMyDayVisible(): boolean {
  const [plan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);
  const [usedDateKey] = useLocalStorage<string | null>(MORNING_FLOW_USED_KEY, null);
  const [todayKey, setTodayKey] = useState(() => localDateKey());

  useEffect(() => {
    const refresh = () => setTodayKey(localDateKey());
    window.addEventListener('focus', refresh);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(id);
    };
  }, []);

  return useMemo(() => {
    if (isMorningFlowUsedToday(usedDateKey)) return false;
    const active = getActiveNightPrepPlan(plan);
    return Boolean(active?.tasks?.length);
  }, [plan, usedDateKey, todayKey]);
}
