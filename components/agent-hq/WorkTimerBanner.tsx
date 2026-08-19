'use client';

import { useEffect, useMemo, type CSSProperties } from 'react';
import { useWorkTrackerContext, useWorkTrackerTick } from './hooks/WorkTrackerProvider';
import { useEndSession } from './hooks/EndSessionProvider';
import { useHoverTimer } from './hooks/HoverTimerProvider';
import type { Infraction } from './types';
import { infractionCategoriesInOrder, startOfLocalDayMs } from './infractions';
import { formatDuration } from './chatLogic';
import { getTimerDisplay, formatTimerDisplay } from './timerDisplay';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const ADJUST_MS = 5 * 60 * 1000;

interface WorkTimerBannerProps {
  infractions: Infraction[];
  onSendEod: () => void;
  onSessionBusyChange?: (busy: boolean) => void;
  onStartTimer: () => void;
}

export default function WorkTimerBanner({
  infractions,
  onSendEod,
  onSessionBusyChange,
  onStartTimer,
}: WorkTimerBannerProps) {
  const { requestEndSession } = useEndSession();
  const { isOpen: hoverTimerOpen, supported: hoverTimerSupported, toggle: toggleHoverTimer } = useHoverTimer();
  const {
    getTodayStats,
    status,
    phase,
    timerPaused,
    pauseTimer,
    resumeTimer,
    pomodoroPausedRemaining,
    pausedWorkElapsed,
    currentSession,
    currentBreak,
    adjustCountdownByMs,
  } = useWorkTrackerContext();
  const { elapsed, pomodoroLeft, breakLeft, openCountdownLeft } = useWorkTrackerTick();

  const todayStats = getTodayStats();
  const projectStatsToday = todayStats.projectStats;

  const infractionsToday = useMemo(() => {
    const t0 = startOfLocalDayMs(Date.now());
    return infractions.filter(i => startOfLocalDayMs(i.createdAt) === t0);
  }, [infractions]);

  const infractionCategoriesTodayOrdered = useMemo(
    () => infractionCategoriesInOrder(infractionsToday),
    [infractionsToday]
  );

  const topInfractionLabel = useMemo(() => {
    const ordered = infractionCategoriesTodayOrdered;
    if (ordered.length === 0) return null;
    const max = Math.max(...ordered.map(c => c.count));
    return ordered.find(c => c.count === max)!.label;
  }, [infractionCategoriesTodayOrdered]);

  const hasActiveSession = status === 'working' || status === 'on_break';
  const canPauseTimer = hasActiveSession && !timerPaused;
  const canResumeTimer = hasActiveSession && timerPaused;
  const canAdjustCountdown =
    status === 'working' &&
    (phase === 'pomodoro_working' ||
      (currentSession?.type === 'open' && currentSession.countdownTargetMs != null));
  const canRemoveBonus = canAdjustCountdown && (currentSession?.countdownBonusMs ?? 0) > 0;

  useEffect(() => {
    onSessionBusyChange?.(hasActiveSession);
  }, [hasActiveSession, onSessionBusyChange]);

  const handlePauseResumeTimer = () => {
    if (canResumeTimer) {
      resumeTimer();
    } else if (canPauseTimer) {
      pauseTimer();
    }
  };

  const handleEndWorkSession = () => {
    if (!hasActiveSession) return;
    requestEndSession();
  };

  const countdownDisplay = getTimerDisplay({
    status,
    phase,
    elapsed,
    pomodoroLeft,
    breakLeft,
    pomodoroPausedRemaining: pomodoroPausedRemaining ?? null,
    pausedWorkElapsed: pausedWorkElapsed ?? null,
    openCountdownLeft,
    currentSession,
    currentBreak,
    timerPaused,
  });
  const liveCountdown =
    hasActiveSession && countdownDisplay?.countingDown
      ? formatTimerDisplay(countdownDisplay)
      : null;

  return (
    <div style={styles.timeBanner}>
      <div style={styles.bannerStatsRow}>
        <div style={styles.workTodayCell}>
          <div style={styles.bannerLabel}>Work today</div>
          <div style={{ color: '#0f172a', fontSize: 36, fontWeight: 700 }}>{formatDuration(todayStats.totalWorkMs)}</div>
          <div style={styles.timerControls}>
            {!hasActiveSession ? (
              <button type="button" onClick={onStartTimer} style={styles.timerStartBtn}>
                Start working
              </button>
            ) : (
              <>
                {liveCountdown ? (
                  <div style={styles.liveCountdown} aria-live="polite">
                    {liveCountdown}
                  </div>
                ) : null}
                <div style={styles.timerActionRow}>
                  <div style={styles.timerSegment}>
                    <button
                      type="button"
                      onClick={handlePauseResumeTimer}
                      style={{
                        ...styles.timerSegmentBtn,
                        ...styles.timerSegmentBtnActive,
                        ...(canResumeTimer ? styles.timerSegmentBtnEmphasis : {}),
                      }}
                    >
                      {canResumeTimer ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                  {hoverTimerSupported ? (
                    <button
                      type="button"
                      onClick={() => void toggleHoverTimer()}
                      style={{
                        ...styles.timerFloatBtn,
                        ...(hoverTimerOpen ? styles.timerFloatBtnActive : {}),
                      }}
                      title={hoverTimerOpen ? 'Hide floating timer' : 'Show floating timer'}
                    >
                      {hoverTimerOpen ? 'Hide float' : 'Float timer'}
                    </button>
                  ) : null}
                </div>
                {canAdjustCountdown ? (
                  <div style={styles.timerAdjustRow}>
                    <button
                      type="button"
                      onClick={() => adjustCountdownByMs(ADJUST_MS)}
                      style={styles.timerAdjustAdd}
                      title="Add 5 minutes"
                    >
                      + 5min
                    </button>
                    {canRemoveBonus ? (
                      <button
                        type="button"
                        onClick={() => adjustCountdownByMs(-ADJUST_MS)}
                        style={styles.timerAdjustMinus}
                        title="Remove 5 minutes of added time"
                        aria-label="Remove 5 minutes of added time"
                      >
                        −
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <button type="button" onClick={handleEndWorkSession} style={styles.timerEndBtn}>
                  End session
                </button>
              </>
            )}
          </div>
        </div>
        <div style={styles.divider} />
        <div>
          <div style={styles.bannerLabel}>Sessions</div>
          <div style={{ color: '#0f172a', fontSize: 26, fontWeight: 700 }}>{todayStats.sessionCount}</div>
        </div>
        <div style={styles.divider} />
        <div style={styles.bannerInfractions}>
          <div style={styles.bannerLabel}>Infractions today</div>
          <div style={styles.bannerInfractionsTodayNum}>{infractionsToday.length}</div>
          <div style={styles.bannerLabelTopInfraction}>Top infraction</div>
          {topInfractionLabel ? (
            <div style={styles.bannerTopInfractionNameOnly} title={topInfractionLabel}>
              {topInfractionLabel}
            </div>
          ) : (
            <div style={styles.bannerTopInfractionEmpty}>—</div>
          )}
        </div>
        <div style={styles.divider} />
        <div style={styles.bannerProjects}>
          <div style={styles.bannerLabel}>Time by project (today)</div>
          {projectStatsToday.length > 0 ? (
            <div style={styles.projectList}>
              {projectStatsToday.map(p => {
                const maxMs = projectStatsToday[0].totalMs;
                const pct = (p.totalMs / maxMs) * 100;
                return (
                  <div key={p.name} style={styles.projectItem}>
                    <div style={styles.projectItemHeader}>
                      <span style={styles.projectName}>
                        {p.source === 'misc' ? `Misc · ${p.name}` : p.name}
                      </span>
                      <span style={styles.projectDuration}>{formatDuration(p.totalMs)}</span>
                    </div>
                    <div style={styles.projectBarTrack}>
                      <div style={{ ...styles.projectBarFill, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.projectEmpty}>No sessions yet today</div>
          )}
        </div>
        <div style={styles.divider} />
        <div style={styles.eodAnchor}>
          <div style={styles.bannerLabel}>Reports</div>
          <div style={styles.eodActionsRow}>
            <button type="button" onClick={onSendEod} style={styles.eodSendBtn}>
              Send EOD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  workTodayCell: {
    minWidth: 0,
  },
  timerControls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 5,
    marginTop: 10,
    width: 196,
  },
  timerStartBtn: {
    width: '100%',
    border: 'none',
    borderRadius: 9,
    padding: '7px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#ecfdf5',
    color: '#047857',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.2)',
  },
  liveCountdown: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: '#047857',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.02em',
  },
  timerActionRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 5,
  },
  timerSegment: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
    background: '#eef2f6',
    borderRadius: 9,
    padding: 3,
    gap: 2,
  },
  timerFloatBtn: {
    flexShrink: 0,
    border: 'none',
    borderRadius: 9,
    padding: '6px 8px',
    fontSize: 10,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#ecfdf5',
    color: '#047857',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.25)',
    whiteSpace: 'nowrap',
  },
  timerFloatBtnActive: {
    background: '#eef2f6',
    color: '#64748b',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.06)',
  },
  timerSegmentBtn: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    borderRadius: 7,
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    cursor: 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
  },
  timerSegmentBtnActive: {
    background: '#fff',
    color: '#0f172a',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
  },
  timerSegmentBtnEmphasis: {
    color: '#1d4ed8',
  },
  timerEndBtn: {
    border: 'none',
    borderRadius: 7,
    padding: '5px 8px',
    fontSize: 11,
    fontWeight: 500,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    textAlign: 'center',
  },
  timerAdjustRow: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 5,
    width: '100%',
  },
  timerAdjustAdd: {
    width: '42%',
    flexShrink: 0,
    boxSizing: 'border-box',
    border: 'none',
    borderRadius: 8,
    padding: '5px 8px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#0f172a',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.14)',
  },
  timerAdjustMinus: {
    flexShrink: 0,
    border: 'none',
    borderRadius: 8,
    width: 34,
    padding: '5px 0',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: font,
    lineHeight: 1,
    background: '#e2e8f0',
    color: '#0f172a',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
  },
  timeBanner: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '18px 24px',
  },
  bannerStatsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 24,
    flexWrap: 'wrap',
    rowGap: 16,
  },
  bannerProjects: {
    minWidth: 0,
    flex: '1 1 200px',
    maxWidth: 320,
  },
  projectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 2,
  },
  projectItem: {
    minWidth: 0,
  },
  projectItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  projectName: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectDuration: {
    fontSize: 12,
    color: '#64748b',
    flexShrink: 0,
  },
  projectBarTrack: {
    height: 6,
    background: '#e2e8f0',
    borderRadius: 3,
  },
  projectBarFill: {
    height: '100%',
    background: '#3b82f6',
    borderRadius: 3,
  },
  projectEmpty: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  bannerInfractions: {
    minWidth: 0,
    maxWidth: 300,
    flex: '0 1 280px',
  },
  bannerInfractionsTodayNum: {
    color: '#0f172a',
    fontFamily: font,
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
  },
  bannerLabelTopInfraction: {
    color: '#64748b',
    fontFamily: font,
    fontSize: 13,
    fontWeight: 500,
    marginTop: 12,
    marginBottom: 6,
  },
  bannerTopInfractionNameOnly: {
    color: '#0f172a',
    fontFamily: font,
    fontSize: 15,
    fontWeight: 600,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bannerTopInfractionEmpty: {
    color: '#94a3b8',
    fontFamily: font,
    fontSize: 15,
    fontWeight: 600,
    marginTop: 2,
  },
  bannerLabel: {
    color: '#64748b',
    fontFamily: font,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
  },
  divider: { width: 1, height: 48, background: '#e2e8f0' },
  eodAnchor: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    flexShrink: 0,
  },
  eodActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  eodSendBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#1e293b',
    color: '#f8fafc',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.35)',
    whiteSpace: 'nowrap',
  },
};
