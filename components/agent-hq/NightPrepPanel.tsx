'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
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
import MiscTasksPanel from './MiscTasksPanel';
import type { TodayTaskLine } from './todayTaskList/storage';

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
  onStartMiscLine?: (line: TodayTaskLine) => void;
  sessionBusy?: boolean;
}

export default function NightPrepPanel({
  autoStartWindDown = false,
  onAutoStartHandled,
  onStartTask,
  onStartMiscLine,
  sessionBusy = false,
}: NightPrepPanelProps) {
  const { getTodayStats } = useWorkTrackerContext();
  const { openNightPrepChat } = useNightPrep();
  const [plan, setPlan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);
  const [windDownHovered, setWindDownHovered] = useState(false);
  const [miscOpen, setMiscOpen] = useState(false);

  const removePlanTask = useCallback(
    (task: NightPrepTomorrowTask) => {
      setPlan(prev => {
        const normalized = normalizeNightPrepPlan(prev);
        if (!normalized) return prev;
        const nextTasks = (normalized.tasks ?? []).filter(
          t => !(t.projectId === task.projectId && t.taskId === task.taskId)
        );
        if (nextTasks.length === 0) return null;
        const primary = nextTasks[0];
        return {
          ...normalized,
          tasks: nextTasks,
          updatedAt: Date.now(),
          projectId: primary.projectId,
          projectName: primary.projectName,
          taskId: primary.taskId,
          taskText: primary.taskText,
        };
      });
    },
    [setPlan]
  );

  const startWindDown = useCallback(() => {
    const items = buildWindDownItems(getTodayStats().projectStats);
    openNightPrepChat(items);
  }, [getTodayStats, openNightPrepChat]);

  useEffect(() => {
    if (!autoStartWindDown) return;
    startWindDown();
    onAutoStartHandled?.();
  }, [autoStartWindDown, startWindDown, onAutoStartHandled]);

  const normalizedPlan = plan ? normalizeNightPrepPlan(plan) : null;
  const planTasks = normalizedPlan?.tasks.filter(t => t.taskText.trim()) ?? [];
  const planTime = normalizedPlan?.firstWorkBlockTime.trim() ?? '';
  const listTitle = isNightPrepPlanActiveToday(plan) ? "Today's task list" : "Tomorrow's task list";

  const planCard = (
    <div style={styles.planCard}>
      <style>{`
        [data-plan-row] [data-plan-remove] {
          opacity: 0;
          pointer-events: none;
        }
        [data-plan-row]:hover [data-plan-remove],
        [data-plan-row]:focus-within [data-plan-remove] {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
      <div style={styles.planHeader}>
        <div style={styles.planTitle}>{listTitle}</div>
        {!miscOpen ? (
          <button
            type="button"
            onClick={() => setMiscOpen(true)}
            style={styles.addBtn}
            aria-label="Open misc tasks"
            title="Misc tasks"
          >
            +
          </button>
        ) : null}
      </div>
      {planTasks.length > 0 ? (
        <>
          <div style={styles.planTasks}>
            {planTasks.map(task => {
              const taskKey = `${task.projectId}-${task.taskId}`;
              return (
                <div key={taskKey} data-plan-row="" style={styles.planTaskRow}>
                  <span style={styles.planTaskText}>- {task.taskText.trim()}</span>
                  <span style={styles.planTaskActions}>
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
                    <button
                      type="button"
                      data-plan-remove=""
                      onClick={() => removePlanTask(task)}
                      style={styles.planTaskRemove}
                      aria-label={`Remove ${task.taskText.trim()} from list`}
                      title="Remove from list"
                      tabIndex={-1}
                    >
                      ×
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          {planTime ? <div style={styles.planTime}>{planTime}</div> : null}
        </>
      ) : (
        <div style={styles.emptyPlan}>
          {miscOpen
            ? 'Wind down builds this list.'
            : 'Wind down builds this list. Use + for misc / homeless tasks.'}
        </div>
      )}
    </div>
  );

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

      {miscOpen ? (
        <div style={styles.splitRow}>
          <div style={styles.splitPane}>{planCard}</div>
          <div style={styles.splitPane}>
            <div style={styles.miscCard}>
              <MiscTasksPanel
                onStartLine={onStartMiscLine}
                sessionBusy={sessionBusy}
                onClose={() => setMiscOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : (
        planCard
      )}
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
  splitRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    alignItems: 'start',
    minWidth: 0,
  },
  splitPane: {
    minWidth: 0,
    maxHeight: 260,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  planCard: {
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
    maxHeight: 260,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  miscCard: {
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
    maxHeight: 260,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  planHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    flexShrink: 0,
  },
  planTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
    minWidth: 0,
  },
  addBtn: {
    flexShrink: 0,
    width: 24,
    height: 24,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#f8fafc',
    color: '#475569',
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    fontFamily: font,
  },
  planTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
    minHeight: 0,
    flex: 1,
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
    flex: 1,
  },
  planTaskActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
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
  planTaskRemove: {
    width: 18,
    height: 18,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: font,
  },
  planTime: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.35,
  },
  emptyPlan: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.45,
  },
};
