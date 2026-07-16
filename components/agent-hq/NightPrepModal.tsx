'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useNightPrep } from './hooks/NightPrepProvider';
import { useProjects } from './hooks/ProjectsProvider';
import { useDoneToday } from './hooks/useDoneToday';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ProjectBoard } from './types';
import {
  WIND_DOWN_FLOW_COPY,
  windDownItemLabel,
  type NightPrepFlowPhase,
} from './nightPrep/flows';
import { buildWindDownItems } from './nightPrep/windDownItems';
import {
  addProjectTask,
  requestFocusProject,
  upsertProject,
} from './stuckHelp/projectMutations';
import {
  appendWindDownContextToProjects,
  parseTomorrowTimeLabel,
} from './nightPrep/utils';
import {
  buildNightPrepPlan,
  NIGHT_PREP_PLAN_KEY,
  type NightPrepTomorrowPlan,
  type NightPrepTomorrowTask,
} from './nightPrep/storage';
import { parseFlexibleTime } from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BOT_TYPING_MS = 1300;

const COMPOSE_PHASES: NightPrepFlowPhase[] = [
  'wind_down_item',
  'prep_time',
  'prep_location',
  'prep_project_name',
];

function TypingBubble() {
  return (
    <div style={{ ...styles.msgRow, ...styles.msgRowBot }}>
      <div style={{ ...styles.bubble, ...styles.botBubble, ...styles.typingBubble }}>
        <span className="night-prep-typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="night-prep-typing-dot" style={{ animationDelay: '150ms' }} />
        <span className="night-prep-typing-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default function NightPrepModal() {
  const {
    open,
    flow,
    closeNightPrepChat,
    resetNightPrepChat,
    setNightPrepPhase,
    setNightPrepFields,
    appendNightPrepMessages,
  } = useNightPrep();
  const { items: doneTodayItems } = useDoneToday();
  const { getTodayStats } = useWorkTrackerContext();
  const { projects, setProjects } = useProjects();
  const [, setNightPrepPlan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);

  const [typing, setTyping] = useState(false);
  const [chooseProjectError, setChooseProjectError] = useState(false);
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const openedRef = useRef(false);
  const fieldsRef = useRef({
    firstWorkBlockTime: '',
    workLocation: '',
    projectMode: null as 'choose' | 'input' | null,
    projectId: '',
    projectName: '',
    taskId: '',
    taskText: '',
    windDownIndex: 0,
    tomorrowTasks: [] as NightPrepTomorrowTask[],
  });

  const phase = flow?.phase;
  const messages = flow?.messages ?? [];
  const windDownItems = flow?.windDownItems ?? [];
  const windDownIndex = flow?.windDownIndex ?? 0;
  const currentWindDownItem = windDownItems[windDownIndex];

  const buildCurrentWindDownItems = () =>
    buildWindDownItems(getTodayStats().projectStats, doneTodayItems);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setTyping(false);
      setDraft('');
      draftRef.current = '';
      setChooseProjectError(false);
      openedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !flow || openedRef.current) return;
    openedRef.current = true;
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendNightPrepMessages({ role: 'bot', text: WIND_DOWN_FLOW_COPY.intro });
      schedule(() => {
        if (windDownItems.length === 0) {
          appendNightPrepMessages({ role: 'bot', text: WIND_DOWN_FLOW_COPY.emptyLogged });
          setNightPrepPhase('empty_logged_prompt');
        } else {
          appendNightPrepMessages({
            role: 'bot',
            text: WIND_DOWN_FLOW_COPY.taskPrompt(windDownItemLabel(windDownItems[0])),
          });
          setNightPrepPhase('wind_down_item');
        }
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  }, [open, flow, windDownItems, appendNightPrepMessages, setNightPrepPhase]);

  useEffect(() => {
    if (!open || !phase || typing) return;
    if (phase === 'prep_task_name') {
      inputRef.current?.focus();
      return;
    }
    if (!COMPOSE_PHASES.includes(phase)) return;
    inputRef.current?.focus();
  }, [open, phase, messages.length, typing]);

  useEffect(() => {
    if (!open) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, phase, open, typing]);

  if (!open || !flow || typeof document === 'undefined') return null;

  const sendBotReply = (text: string, typingMs = BOT_TYPING_MS) => {
    setTyping(true);
    schedule(() => {
      appendNightPrepMessages({ role: 'bot', text });
      setTyping(false);
    }, typingMs);
  };

  const beginNightPrep = () => {
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendNightPrepMessages({ role: 'bot', text: WIND_DOWN_FLOW_COPY.prepIntro });
      schedule(() => {
        appendNightPrepMessages({ role: 'bot', text: WIND_DOWN_FLOW_COPY.qFirstBlockTime });
        setNightPrepPhase('prep_time');
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  };

  const advanceWindDown = (skipContext = false) => {
    const nextIndex = windDownIndex + 1;
    fieldsRef.current.windDownIndex = nextIndex;
    setNightPrepFields({ windDownIndex: nextIndex });

    if (nextIndex >= windDownItems.length) {
      beginNightPrep();
      return;
    }

    const nextItem = windDownItems[nextIndex];
    if (!skipContext) {
      sendBotReply(WIND_DOWN_FLOW_COPY.taskPrompt(windDownItemLabel(nextItem)));
    } else {
      setTyping(true);
      schedule(() => {
        appendNightPrepMessages({
          role: 'bot',
          text: WIND_DOWN_FLOW_COPY.taskPrompt(windDownItemLabel(nextItem)),
        });
        setTyping(false);
      }, BOT_TYPING_MS);
    }
    setNightPrepPhase('wind_down_item');
  };

  const saveWindDownContext = (context: string) => {
    const item = currentWindDownItem;
    if (!item) return;
    setProjects(prev => appendWindDownContextToProjects(prev, item, context));
  };

  const skipWindDownContext = () => {
    if (typing) return;
    appendNightPrepMessages({ role: 'user', text: WIND_DOWN_FLOW_COPY.noContextNext });
    advanceWindDown(true);
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!text || typing || !phase) return;

    if (phase === 'wind_down_item') {
      appendNightPrepMessages({ role: 'user', text });
      saveWindDownContext(text);
      setDraft('');
      draftRef.current = '';
      advanceWindDown();
      return;
    }

    if (phase === 'prep_time') {
      fieldsRef.current.firstWorkBlockTime = parseTomorrowTimeLabel(text);
      setNightPrepFields({ firstWorkBlockTime: parseTomorrowTimeLabel(text) });
      appendNightPrepMessages({ role: 'user', text });
      sendBotReply(WIND_DOWN_FLOW_COPY.qWorkLocation);
      setNightPrepPhase('prep_location');
      setDraft('');
      draftRef.current = '';
      return;
    }

    if (phase === 'prep_location') {
      fieldsRef.current.workLocation = text;
      setNightPrepFields({ workLocation: text });
      appendNightPrepMessages({ role: 'user', text });
      sendBotReply(WIND_DOWN_FLOW_COPY.qWhatWorkingOn);
      setNightPrepPhase('prep_project_mode');
      setDraft('');
      draftRef.current = '';
      return;
    }

    if (phase === 'prep_project_name') {
      let project!: ProjectBoard;
      setProjects(prev => {
        const result = upsertProject(prev, text);
        project = result.project;
        return result.projects;
      });
      fieldsRef.current.projectMode = 'input';
      fieldsRef.current.projectId = project.id;
      fieldsRef.current.projectName = project.name.trim();
      fieldsRef.current.taskId = '';
      fieldsRef.current.taskText = '';
      setNightPrepFields({
        projectMode: 'input',
        projectId: project.id,
        projectName: project.name.trim(),
        taskId: '',
        taskText: '',
      });
      appendNightPrepMessages({ role: 'user', text: project.name.trim() });
      requestFocusProject(project.id);
      setNightPrepPhase('prep_task_name');
      setDraft('');
      draftRef.current = '';
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    if (phase === 'prep_task_name') {
      const projectId = flow.projectId || fieldsRef.current.projectId;
      if (!projectId) return;
      let createdTaskId = '';
      setProjects(prev => {
        const next = addProjectTask(prev, projectId, text);
        const project = next.find(p => p.id === projectId);
        const task = project?.tasks[project.tasks.length - 1];
        if (task) createdTaskId = task.id;
        return next;
      });
      fieldsRef.current.taskId = createdTaskId;
      fieldsRef.current.taskText = text;
      setNightPrepFields({ taskId: createdTaskId, taskText: text });
      requestFocusProject(projectId);
      appendTomorrowTask({
        projectId,
        projectName: (flow.projectName || fieldsRef.current.projectName).trim(),
        taskId: createdTaskId,
        taskText: text,
      });
      setDraft('');
      draftRef.current = '';
    }
  };

  const appendTomorrowTask = (task: NightPrepTomorrowTask) => {
    const current = flow.tomorrowTasks ?? fieldsRef.current.tomorrowTasks;
    if (current.some(t => t.projectId === task.projectId && t.taskId === task.taskId)) return;

    const next = [...current, task];
    fieldsRef.current.tomorrowTasks = next;
    setNightPrepFields({ tomorrowTasks: next });
    appendNightPrepMessages({ role: 'user', text: task.taskText });
    setNightPrepPhase('prep_task_pick');
  };

  const finishNightPrep = () => {
    const tasks = flow.tomorrowTasks ?? fieldsRef.current.tomorrowTasks;
    if (!tasks.length) return;
    const time = flow.firstWorkBlockTime || fieldsRef.current.firstWorkBlockTime;
    const plan = buildNightPrepPlan({
      firstWorkBlockTime: time,
      firstWorkBlockMinutes: parseFlexibleTime(time),
      workLocation: flow.workLocation || fieldsRef.current.workLocation,
      tasks,
    });
    setNightPrepPlan(plan);
    sendBotReply(WIND_DOWN_FLOW_COPY.doneSeeTomorrow(time));
    setNightPrepPhase('complete');
  };

  const finishTaskList = () => {
    if (typing) return;
    appendNightPrepMessages({ role: 'user', text: WIND_DOWN_FLOW_COPY.taskListFinished });
    finishNightPrep();
  };

  const beginAddAnotherTask = () => {
    if (typing) return;
    setDraft('');
    draftRef.current = '';
    setChooseProjectError(false);
    fieldsRef.current.projectMode = null;
    fieldsRef.current.projectId = '';
    fieldsRef.current.projectName = '';
    fieldsRef.current.taskId = '';
    fieldsRef.current.taskText = '';
    setNightPrepFields({
      projectMode: null,
      projectId: '',
      projectName: '',
      taskId: '',
      taskText: '',
    });
    const options = projects.filter(p => p.name.trim());
    if (options.length > 0) {
      setNightPrepPhase('prep_project_pick');
      return;
    }
    setChooseProjectError(true);
    setNightPrepPhase('prep_project_mode');
  };

  const beginChooseProject = () => {
    if (typing) return;
    const options = projects.filter(p => p.name.trim());
    if (options.length === 0) {
      setChooseProjectError(true);
      return;
    }
    setChooseProjectError(false);
    fieldsRef.current.projectMode = 'choose';
    setNightPrepFields({ projectMode: 'choose' });
    setNightPrepPhase('prep_project_pick');
  };

  const beginInputProject = () => {
    if (typing) return;
    setChooseProjectError(false);
    fieldsRef.current.projectMode = 'input';
    setNightPrepFields({ projectMode: 'input' });
    setNightPrepPhase('prep_project_name');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const selectProject = (project: ProjectBoard) => {
    if (typing) return;
    const name = project.name.trim() || 'Unnamed project';
    fieldsRef.current.projectMode = 'choose';
    fieldsRef.current.projectId = project.id;
    fieldsRef.current.projectName = name;
    setNightPrepFields({
      projectMode: 'choose',
      projectId: project.id,
      projectName: name,
      taskId: '',
      taskText: '',
    });
    appendNightPrepMessages({ role: 'user', text: name });
    requestFocusProject(project.id);
    setNightPrepPhase('prep_task_pick');
  };

  const selectTask = (taskText: string, taskId: string) => {
    if (typing) return;
    const projectId = flow.projectId || fieldsRef.current.projectId;
    const projectName = flow.projectName || fieldsRef.current.projectName;
    fieldsRef.current.taskId = taskId;
    fieldsRef.current.taskText = taskText;
    setNightPrepFields({ taskId, taskText });
    appendTomorrowTask({
      projectId,
      projectName,
      taskId,
      taskText,
    });
  };

  const beginAddTask = () => {
    if (typing) return;
    setNightPrepPhase('prep_task_name');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleEmptyYes = () => {
    if (typing) return;
    appendNightPrepMessages({ role: 'user', text: WIND_DOWN_FLOW_COPY.emptyYes });
    beginNightPrep();
  };

  const handleEmptyNo = () => {
    if (typing) return;
    appendNightPrepMessages({ role: 'user', text: WIND_DOWN_FLOW_COPY.emptyNo });
    closeNightPrepChat();
  };

  const clearChat = () => {
    clearTimers();
    setTyping(false);
    setDraft('');
    draftRef.current = '';
    fieldsRef.current = {
      firstWorkBlockTime: '',
      workLocation: '',
      projectMode: null,
      projectId: '',
      projectName: '',
      taskId: '',
      taskText: '',
      windDownIndex: 0,
      tomorrowTasks: [],
    };
    setChooseProjectError(false);
    openedRef.current = false;
    resetNightPrepChat(buildCurrentWindDownItems());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDraft();
    }
  };

  const showCompose = phase ? COMPOSE_PHASES.includes(phase) && !typing : false;
  const projectOptions = projects.filter(p => p.name.trim());
  const selectedProject = projects.find(p => p.id === (flow.projectId || fieldsRef.current.projectId));
  const openTasks = selectedProject
    ? selectedProject.tasks.filter(t => !t.done && t.text.trim())
    : [];
  const tomorrowTasks = flow.tomorrowTasks ?? [];
  const selectedProjectId = flow.projectId || fieldsRef.current.projectId;
  const selectedTaskIds = new Set(
    tomorrowTasks.filter(t => t.projectId === selectedProjectId).map(t => t.taskId)
  );
  const hasTomorrowTasks = tomorrowTasks.length > 0;
  const inProjectTaskPick = phase === 'prep_task_pick' || phase === 'prep_task_name';

  return createPortal(
    <>
      <style>{`
        @keyframes nightPrepTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .night-prep-typing-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin: 0 2px;
          border-radius: 50%;
          background: #8e8e93;
          animation: nightPrepTypingBounce 1.2s infinite ease-in-out;
        }
      `}</style>
      <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && closeNightPrepChat()}>
        <div style={styles.shell} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <header style={styles.header}>
            <button type="button" onClick={closeNightPrepChat} style={styles.headerBack}>
              ✕
            </button>
            <div style={styles.headerCenter}>
              <div style={styles.avatar}>b</div>
              <span style={styles.headerTitle}>wind down</span>
            </div>
            <button type="button" onClick={clearChat} style={styles.headerClear}>
              {WIND_DOWN_FLOW_COPY.clearChat}
            </button>
          </header>

          <div ref={threadRef} style={styles.thread}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  ...styles.msgRow,
                  ...(msg.role === 'user' ? styles.msgRowUser : styles.msgRowBot),
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    ...(msg.role === 'user' ? styles.userBubble : styles.botBubble),
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {typing ? <TypingBubble /> : null}
          </div>

          <footer style={styles.footer}>
            {phase === 'wind_down_item' && !typing ? (
              <div style={styles.chipWrap}>
                <button type="button" onClick={skipWindDownContext} style={styles.chip}>
                  {WIND_DOWN_FLOW_COPY.noContextNext}
                </button>
              </div>
            ) : null}

            {phase === 'empty_logged_prompt' && !typing ? (
              <div style={styles.chipWrap}>
                <button type="button" onClick={handleEmptyYes} style={styles.chip}>
                  {WIND_DOWN_FLOW_COPY.emptyYes}
                </button>
                <button type="button" onClick={handleEmptyNo} style={styles.chip}>
                  {WIND_DOWN_FLOW_COPY.emptyNo}
                </button>
              </div>
            ) : null}

            {phase === 'prep_project_mode' && !typing ? (
              <div style={styles.chipWrap}>
                {chooseProjectError ? (
                  <p style={styles.errorText}>No saved projects yet — input a project instead.</p>
                ) : null}
                <button type="button" onClick={beginChooseProject} style={styles.chip}>
                  {WIND_DOWN_FLOW_COPY.chooseProject}
                </button>
                <button type="button" onClick={beginInputProject} style={styles.chip}>
                  {WIND_DOWN_FLOW_COPY.inputProject}
                </button>
                {hasTomorrowTasks ? (
                  <button type="button" onClick={finishTaskList} style={{ ...styles.chip, ...styles.chipFinish }}>
                    {WIND_DOWN_FLOW_COPY.taskListFinished}
                  </button>
                ) : null}
              </div>
            ) : null}

            {phase === 'prep_project_pick' && !typing && projectOptions.length > 0 ? (
              <div style={styles.chipWrap}>
                {projectOptions.map(project => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => selectProject(project)}
                    style={styles.chip}
                  >
                    {project.name.trim()}
                  </button>
                ))}
                {hasTomorrowTasks ? (
                  <button type="button" onClick={finishTaskList} style={{ ...styles.chip, ...styles.chipFinish }}>
                    {WIND_DOWN_FLOW_COPY.taskListFinished}
                  </button>
                ) : null}
              </div>
            ) : null}

            {inProjectTaskPick && !typing ? (
              <div style={styles.chipWrap}>
                <div style={styles.chipSectionLabel}>tasks in this project</div>
                {openTasks.length > 0 ? (
                  <div style={styles.chipTaskGroup}>
                    {openTasks.map(task => {
                      const picked = selectedTaskIds.has(task.id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => selectTask(task.text.trim(), task.id)}
                          style={{
                            ...styles.chip,
                            ...(picked ? styles.chipSelected : {}),
                          }}
                        >
                          {picked ? `✓ ${task.text.trim()}` : task.text.trim()}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.chipSectionEmpty}>No open tasks in this project yet.</div>
                )}
                <div style={styles.chipActionGroup}>
                  <button type="button" onClick={beginAddTask} style={{ ...styles.chip, ...styles.chipAddNew }}>
                    {WIND_DOWN_FLOW_COPY.addNewTask}
                  </button>
                  <button
                    type="button"
                    onClick={beginAddAnotherTask}
                    style={{ ...styles.chip, ...styles.chipAddOther }}
                  >
                    {WIND_DOWN_FLOW_COPY.addAnotherTask}
                  </button>
                  <button
                    type="button"
                    disabled={!hasTomorrowTasks}
                    onClick={finishTaskList}
                    style={{
                      ...styles.chip,
                      ...styles.chipFinish,
                      ...(!hasTomorrowTasks ? styles.chipDisabled : {}),
                    }}
                  >
                    {WIND_DOWN_FLOW_COPY.taskListFinished}
                  </button>
                </div>
                {phase === 'prep_task_name' ? (
                  <div style={styles.compose}>
                    <textarea
                      ref={inputRef}
                      value={draft}
                      onChange={e => {
                        setDraft(e.target.value);
                        draftRef.current = e.target.value;
                      }}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder={WIND_DOWN_FLOW_COPY.taskNamePlaceholder}
                      style={styles.input}
                    />
                    <button
                      type="button"
                      disabled={!draft.trim()}
                      onClick={sendDraft}
                      style={{
                        ...styles.sendBtn,
                        ...(!draft.trim() ? styles.sendBtnDisabled : {}),
                      }}
                      aria-label="Send"
                    >
                      ↑
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showCompose ? (
              <div style={styles.compose}>
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => {
                    setDraft(e.target.value);
                    draftRef.current = e.target.value;
                  }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    phase === 'prep_project_name'
                      ? WIND_DOWN_FLOW_COPY.projectNamePlaceholder
                      : phase === 'prep_task_name'
                        ? WIND_DOWN_FLOW_COPY.taskNamePlaceholder
                        : phase === 'prep_time'
                          ? '2pm'
                          : 'Message'
                  }
                  style={styles.input}
                />
                <button
                  type="button"
                  disabled={!draft.trim()}
                  onClick={sendDraft}
                  style={{
                    ...styles.sendBtn,
                    ...(!draft.trim() ? styles.sendBtnDisabled : {}),
                  }}
                  aria-label="Send"
                >
                  ↑
                </button>
              </div>
            ) : null}

            {phase === 'complete' && !typing ? (
              <div style={styles.chipWrap}>
                <button
                  type="button"
                  onClick={closeNightPrepChat}
                  style={{ ...styles.chip, ...styles.chipFinish }}
                >
                  {WIND_DOWN_FLOW_COPY.closeChat}
                </button>
              </div>
            ) : null}
          </footer>
        </div>
      </div>
    </>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100000,
    fontFamily: font,
  },
  shell: {
    width: '100%',
    maxWidth: 420,
    height: 'min(640px, 85vh)',
    background: '#f2f2f7',
    borderRadius: 20,
    border: '1px solid #d1d5db',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  headerBack: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
    width: 32,
    padding: 0,
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#0f172a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textTransform: 'lowercase',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    textTransform: 'lowercase',
  },
  headerClear: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: '4px 0',
    whiteSpace: 'nowrap',
    textTransform: 'lowercase',
  },
  thread: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  msgRow: { display: 'flex', width: '100%' },
  msgRowBot: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    padding: '9px 13px',
    fontSize: 15,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  botBubble: {
    background: '#e9e9eb',
    color: '#0f172a',
    borderRadius: '18px 18px 18px 4px',
  },
  userBubble: {
    background: '#007aff',
    color: '#fff',
    borderRadius: '18px 18px 4px 18px',
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 52,
    minHeight: 20,
    padding: '12px 14px',
  },
  footer: {
    background: '#fff',
    borderTop: '1px solid #e5e7eb',
    padding: '10px 12px 12px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  chipWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  chipSectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'lowercase',
    color: '#64748b',
    padding: '2px 4px 0',
  },
  chipSectionEmpty: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    padding: '2px 4px 4px',
    lineHeight: 1.4,
  },
  chipTaskGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  chipActionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTop: '1px solid #e5e7eb',
  },
  chip: {
    textAlign: 'center',
    border: '1px solid #007aff',
    borderRadius: 18,
    padding: '9px 13px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#007aff',
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  chipSelected: {
    background: '#e0f2fe',
    borderColor: '#0284c7',
    color: '#0369a1',
  },
  chipAddNew: {
    background: '#fffbeb',
    borderColor: '#f59e0b',
    color: '#b45309',
  },
  chipAddOther: {
    background: '#f5f3ff',
    borderColor: '#8b5cf6',
    color: '#6d28d9',
  },
  chipFinish: {
    background: '#059669',
    borderColor: '#059669',
    color: '#fff',
  },
  chipDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  errorText: {
    margin: 0,
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 1.45,
  },
  compose: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    background: '#f2f2f7',
    borderRadius: 22,
    padding: '6px 6px 6px 14px',
    border: '1px solid #e5e7eb',
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 16,
    fontFamily: font,
    lineHeight: 1.4,
    resize: 'none',
    outline: 'none',
    maxHeight: 100,
    padding: '6px 0',
    color: '#0f172a',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    background: '#007aff',
    color: '#fff',
    fontSize: 18,
    fontWeight: 800,
    fontFamily: font,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  sendBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
};
