'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import AccountMenu from './AccountMenu';
import MiscTasksPanel from './MiscTasksPanel';
import OpenLoopsPanel from './OpenLoopsPanel';
import ProjectsPanel, { addProjectBtnStyle, type ProjectsPanelHandle } from './ProjectsPanel';
import ProjectProgressBar from './ProjectProgressBar';
import SimpleNotesPanel from './SimpleNotesPanel';
import type { ProjectProgress } from './projectProgress';

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
          NOTE: this is a DESKTOP APP &amp; we&apos;ve detected mobile — limited UI
        </p>
        <button type="button" onClick={onUseDesktopUi} style={styles.desktopBtn}>
          Use desktop UI
        </button>
      </div>

      <main style={styles.main}>
        <MobileCard title="Misc tasks">
          <MiscTasksPanel />
        </MobileCard>

        <MobileCard
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
          />
        </MobileCard>

        <MobileCard title="Open loops / unmade decisions">
          <OpenLoopsPanel />
        </MobileCard>

        <MobileCard title="Notes" noPad>
          <SimpleNotesPanel hideFloatingNotes />
        </MobileCard>
      </main>
    </div>
  );
}

function MobileCard({
  title,
  children,
  noPad,
  headerRight,
  titleBeside,
}: {
  title: string;
  children: ReactNode;
  noPad?: boolean;
  headerRight?: ReactNode;
  titleBeside?: ReactNode;
}) {
  return (
    <section style={styles.card}>
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
    padding: '12px 14px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 10,
    flexShrink: 0,
  },
  noticeText: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.35,
    color: '#92400e',
  },
  desktopBtn: {
    marginTop: 10,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    padding: '8px 12px',
    cursor: 'pointer',
    width: '100%',
  },
  main: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '10px 12px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
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
    minHeight: 220,
  },
  cardHeader: {
    padding: '10px 12px',
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
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.25,
  },
  cardHeaderRight: {
    marginLeft: 'auto',
  },
  cardBody: {
    padding: '12px',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  cardBodyNoPad: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
};
