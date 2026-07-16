'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDoneToday } from './hooks/useDoneToday';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useNightPrep } from './hooks/NightPrepProvider';
import { WIND_DOWN_FLOW_COPY } from './nightPrep/flows';
import { buildWindDownItems } from './nightPrep/windDownItems';
import {
  formatNightPrepPlanSummary,
  isNightPrepPlanActiveToday,
  NIGHT_PREP_PLAN_KEY,
  type NightPrepTomorrowPlan,
} from './nightPrep/storage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function WindDownMoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: 'block' }}>
      <path
        d="M17.5 14.2A7.2 7.2 0 0 1 9.8 6.5 5.8 5.8 0 1 0 17.5 14.2Z"
        fill="currentColor"
      />
      <path
        d="M15.8 5.2l.45.95.98.14-.72.7.17.96-.88-.46-.88.46.17-.96-.72-.7.98-.14.45-.95Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface NightPrepPanelProps {
  autoStartWindDown?: boolean;
  onAutoStartHandled?: () => void;
}

export default function NightPrepPanel({
  autoStartWindDown = false,
  onAutoStartHandled,
}: NightPrepPanelProps) {
  const { items: doneTodayItems } = useDoneToday();
  const { getTodayStats } = useWorkTrackerContext();
  const { openNightPrepChat } = useNightPrep();
  const [plan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);
  const [windDownHovered, setWindDownHovered] = useState(false);

  const startWindDown = useCallback(() => {
    const items = buildWindDownItems(getTodayStats().projectStats, doneTodayItems);
    openNightPrepChat(items);
  }, [getTodayStats, doneTodayItems, openNightPrepChat]);

  useEffect(() => {
    if (!autoStartWindDown) return;
    startWindDown();
    onAutoStartHandled?.();
  }, [autoStartWindDown, startWindDown, onAutoStartHandled]);

  return (
    <div style={styles.root}>
      <button
        type="button"
        onClick={startWindDown}
        onMouseEnter={() => setWindDownHovered(true)}
        onMouseLeave={() => setWindDownHovered(false)}
        style={{
          ...styles.windDownBtn,
          ...(windDownHovered ? styles.windDownBtnHover : {}),
        }}
      >
        <span style={styles.windDownIcon}>
          <WindDownMoonIcon />
        </span>
        <span style={styles.windDownLabel}>{WIND_DOWN_FLOW_COPY.windDownButton}</span>
        <span style={styles.windDownChevron} aria-hidden>
          →
        </span>
      </button>

      {plan ? (
        <p style={styles.planSummary}>
          {isNightPrepPlanActiveToday(plan) ? 'Today' : 'Tomorrow'}: {formatNightPrepPlanSummary(plan)}
        </p>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  windDownBtn: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    border: '1.5px solid #818cf8',
    borderRadius: 999,
    padding: '11px 18px',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#fff',
    color: '#6366f1',
    cursor: 'pointer',
    textTransform: 'lowercase',
    transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 1px 2px rgba(99, 102, 241, 0.06)',
  },
  windDownBtnHover: {
    background: '#eef2ff',
    borderColor: '#6366f1',
    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.12)',
  },
  windDownIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    flexShrink: 0,
    color: '#6366f1',
  },
  windDownLabel: {
    flex: 1,
    textAlign: 'center',
    lineHeight: 1,
  },
  windDownChevron: {
    fontSize: 16,
    color: '#6366f1',
    lineHeight: 1,
    width: 22,
    textAlign: 'right',
    flexShrink: 0,
  },
  planSummary: {
    margin: 0,
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 1.45,
    padding: '8px 10px',
    borderRadius: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
};
