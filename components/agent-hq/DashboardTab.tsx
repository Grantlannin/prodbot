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
import { sessionLabel } from './quickstartTask';
import type { NightPrepTomorrowTask } from './nightPrep/storage';
import type { TodayTaskLine } from './todayTaskList/storage';

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
  const [startWorkPreset, setStartWorkPreset] = useState<StartWorkPreset | null>(null);
  const [eodSendOpen, setEodSendOpen] = useState(false);
  const [showOpenLoopExplain, setShowOpenLoopExplain] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const nightPrepRef = useRef<HTMLDivElement>(null);
  const { items: doneTodayItems, addItem: addDoneToday } = useDoneToday();

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
      <WorkTimerBanner
        infractions={infractions}
        onSendEod={handleSendEod}
        onSessionBusyChange={handleSessionBusyChange}
        onStartTimer={handleStartTimer}
      />

      <div style={styles.captureSection}>
        <div style={styles.upperHalf}>
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
              onProjectCompleted={handleProjectCompleted}
            />
          </DashCard>
          <div ref={nightPrepRef} id="night-prep" style={styles.nightPrepCell}>
            <DashCard
              title="WIND DOWN & NIGHT PREP"
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
