'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ProjectBoard } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { listWorkPartGroups, type ListedWorkTask } from './quickstartTask';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const PROJECTS_KEY = 'agentHQ_projects';

interface ChatTaskPickerProps {
  disabled?: boolean;
  onSelectTask: (task: ListedWorkTask) => void;
  onNewTask: () => void;
}

export default function ChatTaskPicker({ disabled, onSelectTask, onNewTask }: ChatTaskPickerProps) {
  const [projects] = useLocalStorage<ProjectBoard[]>(PROJECTS_KEY, []);
  const [expandedPartKey, setExpandedPartKey] = useState<string | null>(null);
  const partGroups = useMemo(() => listWorkPartGroups(projects), [projects]);

  const partGroupKey = (projectId: string, partId: string) => `${projectId}:${partId}`;

  return (
    <div style={styles.wrap}>
      <div style={styles.list}>
        {partGroups.length === 0 ? (
          <p style={styles.empty}>No tasks in your projects yet. Add one below.</p>
        ) : (
          partGroups.map(group => {
            const key = partGroupKey(group.projectId, group.part.taskId);
            const hasSubs = group.subTasks.length > 0;
            const expanded = expandedPartKey === key;
            return (
              <div key={key} style={styles.partGroup}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (hasSubs) {
                      setExpandedPartKey(expanded ? null : key);
                      return;
                    }
                    onSelectTask(group.part);
                  }}
                  style={{
                    ...styles.taskBtn,
                    ...(disabled ? styles.taskBtnDisabled : {}),
                    ...(hasSubs && expanded ? styles.taskBtnExpanded : {}),
                  }}
                >
                  <span style={styles.taskBtnRow}>
                    <span style={styles.taskBtnMain}>
                      <span style={styles.partText}>{group.part.taskText}</span>
                      <span style={styles.taskMeta}>{group.projectName}</span>
                    </span>
                    {hasSubs ? (
                      <span style={styles.expandHint} aria-hidden>
                        {expanded ? '▾' : '▸'}
                      </span>
                    ) : null}
                  </span>
                </button>
                {hasSubs && expanded ? (
                  <div style={styles.subTaskList}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectTask(group.part)}
                      style={{ ...styles.subTaskBtn, ...(disabled ? styles.taskBtnDisabled : {}) }}
                    >
                      <span style={styles.subTaskText}>Whole part</span>
                    </button>
                    {group.subTasks.map(sub => (
                      <button
                        key={sub.subTaskId}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelectTask(sub)}
                        style={{ ...styles.subTaskBtn, ...(disabled ? styles.taskBtnDisabled : {}) }}
                      >
                        <span style={styles.subTaskText}>{sub.taskText}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onNewTask}
        style={{ ...styles.newBtn, ...(disabled ? styles.taskBtnDisabled : {}) }}
      >
        New task
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 420,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 240,
    overflowY: 'auto',
  },
  empty: {
    margin: 0,
    fontSize: 13,
    color: '#737373',
    lineHeight: 1.45,
  },
  taskBtn: {
    width: '100%',
    textAlign: 'left',
    border: '1px solid #333333',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#141414',
    cursor: 'pointer',
    fontFamily: font,
  },
  taskBtnExpanded: {
    background: '#1a1a1a',
    borderColor: '#404040',
  },
  partGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  taskBtnRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  taskBtnMain: {
    minWidth: 0,
    flex: 1,
  },
  expandHint: {
    flexShrink: 0,
    fontSize: 12,
    color: '#737373',
    lineHeight: 1,
  },
  subTaskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingLeft: 12,
    borderLeft: '2px solid #333',
    marginLeft: 10,
  },
  subTaskBtn: {
    width: '100%',
    textAlign: 'left',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    padding: '8px 10px',
    background: '#121212',
    cursor: 'pointer',
    fontFamily: font,
  },
  taskBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  partText: {
    display: 'block',
    fontSize: 14,
    fontWeight: 700,
    color: '#e5e5e5',
    lineHeight: 1.3,
  },
  taskText: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#e5e5e5',
    lineHeight: 1.3,
  },
  subTaskText: {
    display: 'block',
    fontSize: 13,
    fontWeight: 400,
    color: '#a3a3a3',
    lineHeight: 1.3,
  },
  taskMeta: {
    display: 'block',
    marginTop: 2,
    fontSize: 11,
    color: '#737373',
  },
  newBtn: {
    alignSelf: 'flex-start',
    border: '1px dashed #404040',
    borderRadius: 8,
    padding: '8px 12px',
    background: 'transparent',
    color: '#a3a3a3',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
};
