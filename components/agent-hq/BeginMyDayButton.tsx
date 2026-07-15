'use client';

import { useCallback, useState, type CSSProperties } from 'react';
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
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(() => {
    const active = getActiveNightPrepPlan(plan);
    const tasks = active?.tasks?.length ? active.tasks : testMode ? SIMULATED_MORNING_TASKS : null;
    if (!tasks?.length) return;
    openMorningFlow(tasks);
  }, [plan, testMode, openMorningFlow]);

  if (!visible) return null;

  return (
    <div style={styles.wrap}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...styles.btn,
          ...(hovered ? styles.btnHover : {}),
        }}
      >
        <span style={styles.dot} aria-hidden />
        <span style={styles.label}>{MORNING_FLOW_COPY.beginButton}</span>
        <span style={styles.chevron} aria-hidden>
          →
        </span>
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: '14px 20px 6px',
    fontFamily: font,
    display: 'flex',
    justifyContent: 'center',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid #e2e8f0',
    borderRadius: 999,
    padding: '9px 16px 9px 14px',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
    textTransform: 'lowercase',
    transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  btnHover: {
    background: '#f0fdf4',
    borderColor: '#bbf7d0',
    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#22c55e',
    flexShrink: 0,
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.15)',
  },
  label: {
    lineHeight: 1,
  },
  chevron: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1,
    marginLeft: 2,
  },
};
