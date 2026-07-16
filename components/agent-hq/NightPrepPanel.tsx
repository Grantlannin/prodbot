'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDoneToday } from './hooks/useDoneToday';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useNightPrep } from './hooks/NightPrepProvider';
import { WIND_DOWN_FLOW_COPY } from './nightPrep/flows';
import { buildWindDownItems } from './nightPrep/windDownItems';
import {
  isNightPrepPlanActiveToday,
  normalizeNightPrepPlan,
  NIGHT_PREP_PLAN_KEY,
  type NightPrepTomorrowPlan,
  type NightPrepTomorrowTask,
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
  onStartTask?: (task: NightPrepTomorrowTask) => void;
  sessionBusy?: boolean;
}

export default function NightPrepPanel({
  autoStartWindDown = false,
  onAutoStartHandled,
  onStartTask,
  sessionBusy = false,
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

  const normalizedPlan = plan ? normalizeNightPrepPlan(plan) : null;
  const planTasks = normalizedPlan?.tasks.filter(t => t.taskText.trim()) ?? [];
  const planTime = normalizedPlan?.firstWorkBlockTime.trim() ?? '';

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

      {normalizedPlan && planTasks.length > 0 ? (
        <div style={styles.planCard}>
          <div style={styles.planTitle}>
            {isNightPrepPlanActiveToday(plan) ? "Today's task list" : "Tomorrow's task list"}
          </div>
          <div style={styles.planTasks}>
            {planTasks.map(task => (
              <div key={`${task.projectId}-${task.taskId}`} style={styles.planTaskRow}>
                <span style={styles.planTaskText}>- {task.taskText.trim()}</span>
                {onStartTask ? (
                  <button
                    type="button"
                    onClick={() => onStartTask(task)}
                    disabled={sessionBusy}
                    style={{
                      ...styles.planTaskStart,
                      ...(sessionBusy ? styles.planTaskStartDisabled : {}),
                    }}
                    aria-label={`Start ${task.taskText.trim()}`}
                    title={sessionBusy ? 'Stop your current session first' : `Start ${task.taskText.trim()}`}
                  >
                    (start)
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {planTime ? <div style={styles.planTime}>{planTime}</div> : null}
        </div>
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
  planCard: {
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #e2e8f0',
  },
  planTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
    marginBottom: 8,
  },
  planTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  planTaskRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
    fontSize: 12,
    color: '#334155',
    lineHeight: 1.45,
  },
  planTaskText: {
    minWidth: 0,
  },
  planTaskStart: {
    flexShrink: 0,
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#047857',
    cursor: 'pointer',
    lineHeight: 1.2,
  },
  planTaskStartDisabled: {
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
  planTime: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.35,
  },
};
