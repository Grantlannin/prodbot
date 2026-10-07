'use client';

import { useCallback, useEffect, useRef, useState, CSSProperties, type ReactNode } from 'react';
import { useDoneToday } from './hooks/useDoneToday';
import type { Infraction } from './types';
import SimpleNotesPanel from './SimpleNotesPanel';
import ProjectsPanel, { addProjectBtnStyle, type ProjectsPanelHandle } from './ProjectsPanel';
import ProjectProgressBar from './ProjectProgressBar';
import type { ProjectProgress } from './projectProgress';
import OpenLoopsPanel, {
  OpenLoopExplainModal,
  openLoopExplainLinkStyle,
} from './OpenLoopsPanel';
import NightPrepPanel from './NightPrepPanel';
import BeginMyDayButton from './BeginMyDayButton';
import EodSendModal from './EodSendModal';
import StartWorkModal, { type StartWorkPreset } from './StartWorkModal';
import HowToStartBanner from './HowToStartBanner';
import WorkTimerBanner from './WorkTimerBanner';
import TutorialVideoModal from './TutorialVideoModal';
import { sessionLabel } from './quickstartTask';
import type { NightPrepTomorrowTask } from './nightPrep/storage';
import type { TodayTaskLine } from './todayTaskList/storage';
import { TUTORIAL_LOOM_URLS } from './tutorialLinks';
import { useLocalStorage } from './hooks/useLocalStorage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const PROJECTS_WIDTH_KEY_LEGACY = 'agentHQ_projectsColumnWidth';
const PROJECTS_WIDTH_BY_PROJECT_KEY = 'agentHQ_projectsColumnWidthByProject';
const PROJECTS_WIDTH_LAST_KEY = 'agentHQ_projectsColumnWidthLast';
const PROJECTS_WIDTH_DEFAULT = 560;
const PROJECTS_WIDTH_MIN = 280;
/** Wind Down column floor — Projects drag-right stops so this width is preserved. */
const NIGHT_PREP_MIN_WIDTH = 400;
const UPPER_HALF_GAP_PX = 16;

function clampProjectsWidth(w: number, maxWidth: number): number {
  if (!Number.isFinite(w)) return PROJECTS_WIDTH_DEFAULT;
  const max = Math.max(PROJECTS_WIDTH_MIN, maxWidth);
  return Math.min(max, Math.max(PROJECTS_WIDTH_MIN, Math.round(w)));
}

function readLegacyProjectsWidth(): number {
  if (typeof window === 'undefined') return PROJECTS_WIDTH_DEFAULT;
  try {
    const raw = window.localStorage.getItem(PROJECTS_WIDTH_KEY_LEGACY);
    if (raw == null) return PROJECTS_WIDTH_DEFAULT;
    const n = JSON.parse(raw) as number;
    if (!Number.isFinite(n)) return PROJECTS_WIDTH_DEFAULT;
    return Math.min(1400, Math.max(PROJECTS_WIDTH_MIN, Math.round(n)));
  } catch {
    return PROJECTS_WIDTH_DEFAULT;
  }
}

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
  const projectsCornerDragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const [selectedProjectProgress, setSelectedProjectProgress] = useState<ProjectProgress | null>(null);
  const [startWorkOpen, setStartWorkOpen] = useState(false);
  const [startWorkPreset, setStartWorkPreset] = useState<StartWorkPreset | null>(null);
  const [eodSendOpen, setEodSendOpen] = useState(false);
  const [showOpenLoopExplain, setShowOpenLoopExplain] = useState(false);
  const [windDownTutorialOpen, setWindDownTutorialOpen] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [widthByProject, setWidthByProject] = useLocalStorage<Record<string, number>>(
    PROJECTS_WIDTH_BY_PROJECT_KEY,
    {}
  );
  const [lastProjectsWidth, setLastProjectsWidth] = useLocalStorage<number>(
    PROJECTS_WIDTH_LAST_KEY,
    PROJECTS_WIDTH_DEFAULT
  );
  const legacyProjectsWidthRef = useRef(readLegacyProjectsWidth());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const upperHalfRef = useRef<HTMLDivElement>(null);
  const nightPrepRef = useRef<HTMLDivElement>(null);
  const [projectsWidthMax, setProjectsWidthMax] = useState(1200);
  const { items: doneTodayItems, addItem: addDoneToday } = useDoneToday();
  const widthFallback = Number.isFinite(lastProjectsWidth)
    ? lastProjectsWidth
    : legacyProjectsWidthRef.current;
  const projectsWidth = clampProjectsWidth(
    selectedProjectId
      ? (widthByProject[selectedProjectId] ?? widthFallback)
      : widthFallback,
    projectsWidthMax
  );

  const setProjectsWidthForSelected = useCallback(
    (w: number) => {
      const next = clampProjectsWidth(w, projectsWidthMax);
      setLastProjectsWidth(next);
      if (!selectedProjectId) return;
      setWidthByProject(prev => ({ ...prev, [selectedProjectId]: next }));
    },
    [projectsWidthMax, selectedProjectId, setLastProjectsWidth, setWidthByProject]
  );

  useEffect(() => {
    try {
      window.localStorage.removeItem('agentHQ_projectsPanelScale');
      if (window.localStorage.getItem(PROJECTS_WIDTH_LAST_KEY) == null) {
        setLastProjectsWidth(readLegacyProjectsWidth());
      }
    } catch {
      /* ignore */
    }
  }, [setLastProjectsWidth]);

  useEffect(() => {
    const el = upperHalfRef.current;
    if (!el) return;
    const update = () => {
      const max = el.clientWidth - UPPER_HALF_GAP_PX - NIGHT_PREP_MIN_WIDTH;
      setProjectsWidthMax(Math.max(PROJECTS_WIDTH_MIN, max));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setWidthByProject(prev => {
      const stored = prev[selectedProjectId] ?? legacyProjectsWidthRef.current;
      const next = clampProjectsWidth(stored, projectsWidthMax);
      if (next === stored) return prev;
      return { ...prev, [selectedProjectId]: next };
    });
  }, [projectsWidthMax, selectedProjectId, setWidthByProject]);

  const applyProjectsFreeResize = useCallback(
    (startW: number, startH: number, clientX: number, clientY: number, startX: number, startY: number) => {
      setProjectsWidthForSelected(startW + (clientX - startX));
      projectsRef.current?.setTaskListHeight(startH + (clientY - startY));
    },
    [setProjectsWidthForSelected]
  );

  const handleStartTimer = useCallback(() => {
    setStartWorkPreset(null);
    setStartWorkOpen(true);
  }, []);

  const handleStartPlanTask = useCallback((task: NightPrepTomorrowTask) => {
    setStartWorkPreset({
      label: sessionLabel(task.projectName, task.taskText),
      taskRef: { projectId: task.projectId, taskId: task.taskId },
    });
    setStartWorkOpen(true);
  }, []);

  const handleStartMiscLine = useCallback((line: TodayTaskLine) => {
    const text = line.text.trim();
    if (!text) return;
    setStartWorkPreset({
      label: text,
      source: 'misc',
      miscLineId: line.id,
    });
    setStartWorkOpen(true);
  }, []);

  const handleProjectCompleted = useCallback(
    (payload: { text: string; detail: string; projectId: string }) => {
      addDoneToday({
        ...payload,
        source: 'project',
      });
    },
    [addDoneToday]
  );

  const handleSessionBusyChange = useCallback((busy: boolean) => {
    setSessionBusy(busy);
  }, []);

  const handleSendEod = useCallback(() => {
    setEodSendOpen(true);
  }, []);

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
      <HowToStartBanner />
      <StartWorkModal
        open={startWorkOpen}
        onClose={() => {
          setStartWorkOpen(false);
          setStartWorkPreset(null);
        }}
        preset={startWorkPreset}
      />
      <EodSendModal
        open={eodSendOpen}
        onClose={() => setEodSendOpen(false)}
        infractions={infractions}
        doneTodayItems={doneTodayItems}
      />
      <TutorialVideoModal
        open={windDownTutorialOpen}
        onClose={() => setWindDownTutorialOpen(false)}
        title="How to use wind down prep"
        videoUrl={TUTORIAL_LOOM_URLS.windDown}
      />
      <WorkTimerBanner
        infractions={infractions}
        onSendEod={handleSendEod}
        onSessionBusyChange={handleSessionBusyChange}
        onStartTimer={handleStartTimer}
      />

      <div style={styles.captureSection}>
        <div
          ref={upperHalfRef}
          style={{
            ...styles.upperHalf,
            gap: UPPER_HALF_GAP_PX,
            gridTemplateColumns: `${projectsWidth}px minmax(${NIGHT_PREP_MIN_WIDTH}px, 1fr)`,
          }}
        >
          <div style={styles.projectsColumn}>
            <DashCard
              title="Projects"
              titleBeside={
                <button
                  type="button"
                  onClick={() => projectsRef.current?.addProject()}
                  style={addProjectBtnStyle}
                >
                  Add project
                </button>
              }
              headerRight={
                selectedProjectProgress && selectedProjectProgress.total > 0 ? (
                  <ProjectProgressBar progress={selectedProjectProgress} compact />
                ) : null
              }
            >
              <ProjectsPanel
                ref={projectsRef}
                onSelectedProgressChange={setSelectedProjectProgress}
                onSelectedProjectIdChange={setSelectedProjectId}
                onProjectCompleted={handleProjectCompleted}
                panelWidth={projectsWidth}
                onPanelWidthChange={setProjectsWidthForSelected}
              />
            </DashCard>
            <div
              role="separator"
              aria-label="Drag corner to resize Projects"
              title="Drag any direction to resize Projects"
              style={styles.projectsCornerHandle}
              onPointerDown={e => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                projectsCornerDragRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  startW: projectsWidth,
                  startH: projectsRef.current?.getTaskListHeight() ?? 0,
                };
              }}
              onPointerMove={e => {
                const drag = projectsCornerDragRef.current;
                if (!drag) return;
                applyProjectsFreeResize(
                  drag.startW,
                  drag.startH,
                  e.clientX,
                  e.clientY,
                  drag.startX,
                  drag.startY
                );
              }}
              onPointerUp={() => {
                projectsCornerDragRef.current = null;
              }}
              onPointerCancel={() => {
                projectsCornerDragRef.current = null;
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ display: 'block' }}>
                <path
                  d="M11 1v10H1"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 11h4V7"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div ref={nightPrepRef} id="night-prep" style={styles.nightPrepCell}>
            <DashCard
              title="WIND DOWN & NIGHT PREP"
              headerRight={
                <button
                  type="button"
                  onClick={() => setWindDownTutorialOpen(true)}
                  style={openLoopExplainLinkStyle}
                >
                  how to use wind down prep
                </button>
              }
            >
              <NightPrepPanel
                autoStartWindDown={focusNightPrep}
                onAutoStartHandled={onNightPrepFocused}
                onStartTask={handleStartPlanTask}
                onStartMiscLine={handleStartMiscLine}
                sessionBusy={sessionBusy}
              />
            </DashCard>
          </div>
        </div>

        <div style={styles.lowerHalf}>
          <div style={styles.lowerLeft}>
            <DashCard
              title="Simple Notes"
              noPad
            >
              <SimpleNotesPanel />
            </DashCard>
          </div>
          <DashCard
            title="open loops / unmade decisions"
            headerRight={
              <button
                type="button"
                onClick={() => setShowOpenLoopExplain(true)}
                style={openLoopExplainLinkStyle}
              >
                what&apos;s an open loop?
              </button>
            }
          >
            <OpenLoopsPanel />
          </DashCard>
        </div>
      </div>
      {showOpenLoopExplain ? (
        <OpenLoopExplainModal onClose={() => setShowOpenLoopExplain(false)} />
      ) : null}
    </div>
  );
}

function DashCard({
  title,
  children,
  noPad,
  headerRight,
  titleBeside,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  noPad?: boolean;
  headerRight?: ReactNode;
  titleBeside?: ReactNode;
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
          alignItems: 'flex-start',
          gap: 10,
          minHeight: 40,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              minHeight: 20,
            }}
          >
            <span
              style={{
                color: '#0f172a',
                fontFamily: font,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.25,
                minWidth: 0,
              }}
            >
              {title}
            </span>
            {titleBeside ? <span style={{ flexShrink: 0 }}>{titleBeside}</span> : null}
            {headerRight ? (
              <span style={{ flexShrink: 0, marginLeft: 'auto' }}>{headerRight}</span>
            ) : null}
          </div>
        </div>
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
  captureSection: {
    padding: '20px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  upperHalf: {
    display: 'grid',
    gridTemplateColumns: 'minmax(380px, 2fr) minmax(400px, 1fr)',
    gap: UPPER_HALF_GAP_PX,
    alignItems: 'start',
  },
  projectsColumn: {
    position: 'relative',
    minWidth: 0,
    minHeight: 0,
  },
  projectsCornerHandle: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    cursor: 'nwse-resize',
    touchAction: 'none',
    userSelect: 'none',
    zIndex: 8,
    padding: 2,
    boxSizing: 'border-box',
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
