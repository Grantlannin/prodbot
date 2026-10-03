'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import AccountMenu from './AccountMenu';
import OpenLoopsPanel from './OpenLoopsPanel';
import ProjectsPanel, { addProjectBtnStyle, type ProjectsPanelHandle } from './ProjectsPanel';
import ProjectProgressBar from './ProjectProgressBar';
import SimpleNotesPanel from './SimpleNotesPanel';
import type { ProjectProgress } from './projectProgress';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  isNightPrepPlanActiveToday,
  normalizeNightPrepPlan,
  NIGHT_PREP_PLAN_KEY,
  type NightPrepTomorrowPlan,
} from './nightPrep/storage';
import {
  TODAY_TASK_LIST_KEY,
  emptyTodayTaskList,
  makeTodayLineId,
  normalizeTodayTaskList,
  type TodayTaskLine,
  type TodayTaskListStore,
} from './todayTaskList/storage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface MobileAppShellProps {
  onUseDesktopUi: () => void;
}

export default function MobileAppShell({ onUseDesktopUi }: MobileAppShellProps) {
  const projectsRef = useRef<ProjectsPanelHandle>(null);
  const [selectedProjectProgress, setSelectedProjectProgress] = useState<ProjectProgress | null>(null);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <AccountMenu />
      </header>

      <div style={styles.notice}>
        <p style={styles.noticeText}>
          NOTE: This is a desktop-only app (very specific usecase) and we&apos;ve detected mobile — limited
          UI. If you continue usage on here, your blocker will not work. basically nothing will work. The
          point is to get off of your phone, not use more of it.
        </p>
        <button type="button" onClick={onUseDesktopUi} style={styles.desktopBtn}>
          Use desktop UI
        </button>
      </div>

      <main style={styles.main}>
        <MobileCard title="Today’s work" tall>
          <MobileWindDownTasks />
          <div style={styles.sectionDivider} />
          <MobileSimpleMiscTasks />
        </MobileCard>

        <MobileCard
          title="Projects"
          tall
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
          />
        </MobileCard>

        <MobileCard title="Open loops / unmade decisions" tall>
          <OpenLoopsPanel />
        </MobileCard>

        <MobileCard title="Notes" tall noPad>
          <SimpleNotesPanel hideFloatingNotes />
        </MobileCard>
      </main>
    </div>
  );
}

function MobileWindDownTasks() {
  const [plan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);
  const normalized = plan ? normalizeNightPrepPlan(plan) : null;
  const tasks = normalized?.tasks.filter(t => t.taskText.trim()) ?? [];
  const listTitle = isNightPrepPlanActiveToday(plan) ? "Today's task list" : "Tomorrow's task list";

  return (
    <div>
      <div style={styles.subhead}>{listTitle}</div>
      {tasks.length === 0 ? (
        <p style={styles.emptyHint}>No wind-down main task set yet. Set it on desktop.</p>
      ) : (
        <ul style={styles.readOnlyList}>
          {tasks.map(task => (
            <li key={`${task.projectId}:${task.taskId}`} style={styles.readOnlyItem}>
              <div style={styles.readOnlyTask}>{task.taskText.trim()}</div>
              {task.projectName.trim() ? (
                <div style={styles.readOnlyMeta}>{task.projectName.trim()}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MobileSimpleMiscTasks() {
  const [store, setStore] = useLocalStorage<TodayTaskListStore>(TODAY_TASK_LIST_KEY, emptyTodayTaskList());
  const [draft, setDraft] = useState('');
  const today = useMemo(() => normalizeTodayTaskList(store), [store]);

  const commitLines = useCallback(
    (lines: TodayTaskLine[]) => {
      setStore({
        dateKey: today.dateKey,
        lines,
        updatedAt: Date.now(),
      });
    },
    [setStore, today.dateKey]
  );

  const addLine = () => {
    const text = draft.trim();
    if (!text) return;
    commitLines([
      ...today.lines,
      { id: makeTodayLineId(), text, createdAt: Date.now(), done: false },
    ]);
    setDraft('');
  };

  const removeLine = (id: string) => {
    commitLines(today.lines.filter(line => line.id !== id));
  };

  const onDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLine();
    }
  };

  return (
    <div>
      <div style={styles.subhead}>Misc tasks</div>
      {today.lines.length === 0 ? (
        <p style={styles.emptyHint}>No misc tasks yet.</p>
      ) : (
        <ul style={styles.miscList}>
          {today.lines.map(line => (
            <li key={line.id} style={styles.miscItem}>
              <span style={styles.miscText}>{line.text.trim() || '(empty)'}</span>
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                style={styles.removeBtn}
                aria-label={`Remove ${line.text.trim() || 'task'}`}
              >
                −
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={styles.addRow}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onDraftKeyDown}
          placeholder="Add a misc task…"
          style={styles.addInput}
        />
        <button
          type="button"
          onClick={addLine}
          style={{
            ...styles.addBtn,
            ...(!draft.trim() ? styles.addBtnDisabled : {}),
          }}
          disabled={!draft.trim()}
        >
          +
        </button>
      </div>
    </div>
  );
}

function MobileCard({
  title,
  children,
  noPad,
  headerRight,
  titleBeside,
  tall,
}: {
  title: string;
  children: ReactNode;
  noPad?: boolean;
  headerRight?: ReactNode;
  titleBeside?: ReactNode;
  tall?: boolean;
}) {
  return (
    <section style={{ ...styles.card, ...(tall ? styles.cardTall : {}) }}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleRow}>
          <h2 style={styles.cardTitle}>{title}</h2>
          {titleBeside}
          {headerRight ? <span style={styles.cardHeaderRight}>{headerRight}</span> : null}
        </div>
      </div>
      <div style={noPad ? styles.cardBodyNoPad : styles.cardBody}>{children}</div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    width: '100%',
    background: '#f1f5f9',
    overflow: 'hidden',
    fontFamily: font,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  notice: {
    margin: '10px 12px 0',
    padding: '14px 14px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 10,
    flexShrink: 0,
  },
  noticeText: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.45,
    color: '#92400e',
  },
  desktopBtn: {
    marginTop: 12,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    padding: '10px 12px',
    cursor: 'pointer',
    width: '100%',
  },
  main: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '12px 12px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    WebkitOverflowScrolling: 'touch',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 280,
  },
  cardTall: {
    minHeight: 360,
  },
  cardHeader: {
    padding: '12px 14px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.25,
  },
  cardHeaderRight: {
    marginLeft: 'auto',
  },
  cardBody: {
    padding: '14px',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  cardBodyNoPad: {
    flex: 1,
    minHeight: 280,
    display: 'flex',
    flexDirection: 'column',
  },
  sectionDivider: {
    height: 1,
    background: '#e2e8f0',
    margin: '16px 0',
  },
  subhead: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 10,
  },
  emptyHint: {
    margin: 0,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  readOnlyList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  readOnlyItem: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#f8fafc',
  },
  readOnlyTask: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  readOnlyMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  miscList: {
    listStyle: 'none',
    margin: '0 0 12px',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  miscItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    background: '#fff',
  },
  miscText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 18,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    flexShrink: 0,
    lineHeight: 1,
  },
  addRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  addInput: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: font,
    color: '#0f172a',
    outline: 'none',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#0f172a',
    color: '#fff',
    fontSize: 22,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    flexShrink: 0,
    lineHeight: 1,
  },
  addBtnDisabled: {
    opacity: 0.4,
    cursor: 'default',
  },
};
