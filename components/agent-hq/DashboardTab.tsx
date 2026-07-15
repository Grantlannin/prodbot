'use client';

import { useEffect, useMemo, useRef, useState, CSSProperties, type ReactNode } from 'react';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useEndSession } from './hooks/EndSessionProvider';
import { useHoverTimer } from './hooks/HoverTimerProvider';
import { useDoneToday } from './hooks/useDoneToday';
import type { Infraction } from './types';
import { infractionCategoriesInOrder, startOfLocalDayMs } from './infractions';
import { formatDuration } from './chatLogic';
import { getTimerDisplay, formatTimerDisplay } from './timerDisplay';
import AppleNotesPanel from './AppleNotesPanel';
import ProjectsPanel, { addProjectBtnStyle, type ProjectsPanelHandle } from './ProjectsPanel';
import ProjectProgressBar from './ProjectProgressBar';
import type { ProjectProgress } from './projectProgress';
import DayAtGlancePanel from './DayAtGlancePanel';
import OpenLoopsPanel from './OpenLoopsPanel';
import NightPrepPanel from './NightPrepPanel';
import BeginMyDayButton from './BeginMyDayButton';
import { DoneTodayBanner } from './DoneTodaySection';
import EodReportsCalendar from './EodReportsCalendar';
import EodSendModal from './EodSendModal';
import StartWorkModal from './StartWorkModal';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface DashboardTabProps {
  infractions: Infraction[];
  focusNightPrep?: boolean;
  onNightPrepFocused?: () => void;
}

export default function DashboardTab({
  infractions,
  focusNightPrep = false,
  onNightPrepFocused,
}: DashboardTabProps) {
  const projectsRef = useRef<ProjectsPanelHandle>(null);
  const [selectedProjectProgress, setSelectedProjectProgress] = useState<ProjectProgress | null>(null);
  const [startWorkOpen, setStartWorkOpen] = useState(false);
  const [setTimerOpen, setSetTimerOpen] = useState(false);
  const [eodSendOpen, setEodSendOpen] = useState(false);
  const nightPrepRef = useRef<HTMLDivElement>(null);
  const { requestEndSession } = useEndSession();
  const { isOpen: hoverTimerOpen, supported: hoverTimerSupported, toggle: toggleHoverTimer } = useHoverTimer();
  const {
    getTodayStats,
    status,
    phase,
    timerPaused,
    pauseTimer,
    resumeTimer,
    elapsed,
    pomodoroLeft,
    breakLeft,
    openCountdownLeft,
    pomodoroPausedRemaining,
    pausedWorkElapsed,
    currentSession,
    currentBreak,
  } = useWorkTrackerContext();
  const { items: doneTodayItems, addItem: addDoneToday, removeItem: removeDoneToday } = useDoneToday();
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

  const handleStartTimer = () => {
    setStartWorkOpen(true);
  };

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

  const handleSetTimer = () => {
    setSetTimerOpen(true);
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

  const [, setCountdownTick] = useState(0);
  useEffect(() => {
    if (!hasActiveSession || !countdownDisplay?.countingDown || timerPaused) return;
    const id = setInterval(() => setCountdownTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasActiveSession, countdownDisplay?.countingDown, timerPaused]);

  useEffect(() => {
    if (!focusNightPrep) return;
    const el = nightPrepRef.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow 0.3s ease';
      el.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.45)';
      window.setTimeout(() => {
        el.style.boxShadow = '';
        onNightPrepFocused?.();
      }, 2200);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusNightPrep, onNightPrepFocused]);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', overflowY: 'auto', fontFamily: font, position: 'relative' }}>
      <BeginMyDayButton />
      <StartWorkModal open={startWorkOpen} onClose={() => setStartWorkOpen(false)} />
      <StartWorkModal open={setTimerOpen} onClose={() => setSetTimerOpen(false)} mode="set-timer" />
      <EodSendModal
        open={eodSendOpen}
        onClose={() => setEodSendOpen(false)}
        infractions={infractions}
        doneTodayItems={doneTodayItems}
      />
      <div style={styles.timeBanner}>
        <div style={styles.bannerStatsRow}>
          <div style={styles.workTodayCell}>
            <div style={styles.bannerLabel}>Work today</div>
            <div style={{ color: '#0f172a', fontSize: 36, fontWeight: 700 }}>{formatDuration(todayStats.totalWorkMs)}</div>
            <div style={styles.timerControls}>
              {!hasActiveSession ? (
                <div style={styles.timerStartRow}>
                  <button type="button" onClick={handleStartTimer} style={styles.timerStartBtn}>
                    Start
                  </button>
                  <button type="button" onClick={handleSetTimer} style={styles.timerSetBtn}>
                    Set timer
                  </button>
                </div>
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
                  <button type="button" onClick={handleEndWorkSession} style={styles.timerEndBtn}>
                    End session
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={styles.divider} />
          <div>
            <div style={styles.bannerLabel}>Break</div>
            <div style={{ color: '#b45309', fontSize: 26, fontWeight: 700 }}>{formatDuration(todayStats.totalBreakMs)}</div>
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
                        <span style={styles.projectName}>{p.name}</span>
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
          <div style={styles.doneTodayColumn}>
            <DoneTodayBanner
              items={doneTodayItems}
              onRemove={removeDoneToday}
              onAdd={text =>
                addDoneToday({
                  text,
                  source: 'manual',
                })
              }
            />
          </div>
          <div style={styles.divider} />
          <div style={styles.eodAnchor}>
            <div style={styles.bannerLabel}>Reports</div>
            <div style={styles.eodActionsRow}>
              <button type="button" onClick={() => setEodSendOpen(true)} style={styles.eodSendBtn}>
                Send EOD
              </button>
              <EodReportsCalendar />
            </div>
          </div>
        </div>
      </div>

      <div style={styles.captureSection}>
        <div style={styles.upperHalf}>
          <DashCard
            title="Projects"
            headerRight={
              <div style={styles.projectsHeaderRight}>
                <button
                  type="button"
                  onClick={() => projectsRef.current?.addProject()}
                  style={addProjectBtnStyle}
                >
                  Add project
                </button>
                {selectedProjectProgress && selectedProjectProgress.total > 0 ? (
                  <ProjectProgressBar progress={selectedProjectProgress} compact />
                ) : null}
              </div>
            }
          >
            <ProjectsPanel
              ref={projectsRef}
              onSelectedProgressChange={setSelectedProjectProgress}
              onProjectCompleted={payload =>
                addDoneToday({
                  ...payload,
                  source: 'project',
                })
              }
            />
          </DashCard>
          <div ref={nightPrepRef} id="night-prep" style={styles.nightPrepCell}>
            <DashCard title="WIND DOWN & NIGHT PREP">
              <NightPrepPanel
                autoStartWindDown={focusNightPrep}
                onAutoStartHandled={onNightPrepFocused}
              />
            </DashCard>
          </div>
        </div>

        <div style={styles.lowerHalf}>
          <div style={styles.lowerLeft}>
            <DashCard title="Notes" noPad>
              <AppleNotesPanel />
            </DashCard>
            <DashCard title="Day at a glance">
              <DayAtGlancePanel />
            </DashCard>
          </div>
          <DashCard title="Open loops">
            <OpenLoopsPanel />
          </DashCard>
        </div>

      </div>
    </div>
  );
}

function DashCard({
  title,
  children,
  noPad,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  noPad?: boolean;
  headerRight?: ReactNode;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 40,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, color: '#0f172a', fontFamily: font, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          {title}
          {headerRight}
        </span>
      </div>
      <div
        style={
          noPad
            ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
            : { padding: '14px 16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
        }
      >
        {children}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  projectsHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
  },
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
  timerStartRow: {
    display: 'flex',
    gap: 5,
  },
  timerStartBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 9,
    padding: '7px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    letterSpacing: '-0.01em',
    background: '#eef2f6',
    color: '#0f172a',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.04)',
  },
  timerSetBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 9,
    padding: '7px 8px',
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
  doneTodayColumn: {
    minWidth: 0,
    flex: '1.2 1 260px',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
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
    background: '#ecfdf5',
    color: '#047857',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.25)',
    whiteSpace: 'nowrap',
  },
  captureSection: {
    padding: '20px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  upperHalf: {
    display: 'grid',
    gridTemplateColumns: 'minmax(380px, 2fr) minmax(300px, 1fr)',
    gap: 16,
    alignItems: 'start',
  },
  lowerHalf: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(340px, 1fr))',
    gap: 16,
    alignItems: 'start',
  },
  lowerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  nightPrepCell: {
    scrollMarginTop: 24,
    minWidth: 0,
  },
};
