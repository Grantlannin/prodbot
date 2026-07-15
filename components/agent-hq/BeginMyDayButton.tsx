'use client';

import { useCallback, type CSSProperties } from 'react';
import { useMorningFlow } from './hooks/MorningFlowProvider';
import { useBeginMyDayVisible } from './hooks/useBeginMyDayVisible';
import { useLocalStorage } from './hooks/useLocalStorage';
import { getActiveNightPrepPlan, NIGHT_PREP_PLAN_KEY, type NightPrepTomorrowPlan } from './nightPrep/storage';
import { MORNING_FLOW_COPY, SIMULATED_MORNING_TASKS } from './morningFlow/flows';
import { MORNING_FLOW_TEST_MODE_KEY } from './morningFlow/storage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function BeginMyDayButton() {
  const visible = useBeginMyDayVisible();
  const { openMorningFlow } = useMorningFlow();
  const [plan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);
  const [testMode] = useLocalStorage<boolean>(MORNING_FLOW_TEST_MODE_KEY, false);

  const handleClick = useCallback(() => {
    const active = getActiveNightPrepPlan(plan);
    const tasks = active?.tasks?.length ? active.tasks : testMode ? SIMULATED_MORNING_TASKS : null;
    if (!tasks?.length) return;
    openMorningFlow(tasks);
  }, [plan, testMode, openMorningFlow]);

  if (!visible) return null;

  return (
    <div style={styles.wrap}>
      <button type="button" onClick={handleClick} style={styles.btn}>
        {MORNING_FLOW_COPY.beginButton}
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: '16px 20px 0',
    fontFamily: font,
  },
  btn: {
    width: '100%',
    border: '1px solid #15803d',
    borderRadius: 14,
    padding: '16px 18px',
    fontSize: 18,
    fontWeight: 800,
    fontFamily: font,
    background: '#16a34a',
    color: '#fff',
    cursor: 'pointer',
    textTransform: 'lowercase',
    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
  },
};
