'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useStuckHelp } from './hooks/StuckHelpProvider';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ProjectBoard } from './types';
import {
  ORGANIZING_FLOW_COPY,
  STARTING_FLOW_COPY,
  STUCK_HELP_OPTIONS,
  type OrganizingFlowPhase,
  type StartingFlowPhase,
  type StuckHelpPath,
} from './stuckHelp/flows';
import {
  PROJECTS_STORAGE_KEY,
  addProjectTask,
  upsertProject,
} from './stuckHelp/projectMutations';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const BOT_TYPING_MS = 1300;

const STARTING_COMPOSE_PHASES: StartingFlowPhase[] = ['await_task', 'await_prep_plan', 'await_chunks'];
const STARTING_YES_PHASES: StartingFlowPhase[] = ['await_prep_yes', 'await_chunk_yes'];

const ORGANIZING_COMPOSE_PHASES: OrganizingFlowPhase[] = ['await_project', 'await_mvp_tasks'];

function TypingBubble() {
  return (
    <div style={{ ...styles.msgRow, ...styles.msgRowBot }}>
      <div style={{ ...styles.bubble, ...styles.botBubble, ...styles.typingBubble }}>
        <span className="stuck-help-typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="stuck-help-typing-dot" style={{ animationDelay: '150ms' }} />
        <span className="stuck-help-typing-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default function StuckHelpModal() {
  const {
    open,
    closeStuckHelp,
    startingFlow,
    organizingFlow,
    startStartingFlow,
    startOrganizingFlow,
    clearStartingFlow,
    setStartingPhase,
    setOrganizingPhase,
    setStartingFields,
    setOrganizingFields,
    appendStartingMessages,
    appendOrganizingMessages,
    postPrepResume,
    clearPostPrepResume,
    beginPrepTimer,
    beginWorkTimer,
  } = useStuckHelp();
  const { status } = useWorkTrackerContext();
  const [projects, setProjects] = useLocalStorage<ProjectBoard[]>(PROJECTS_STORAGE_KEY, []);
  const [typing, setTyping] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef('');
  const [draft, setDraft] = useState('');
  const flowFieldsRef = useRef({ importantTask: '', prepPlan: '', chunks: '' });
  const organizingFieldsRef = useRef({
    projectId: '',
    projectName: '',
    taskTexts: [] as string[],
    hardestTask: '',
  });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const busy = status === 'working' || status === 'on_break';
  const inStarting = startingFlow !== null;
  const inOrganizing = organizingFlow !== null;
  const inChat = inStarting || inOrganizing;
  const startingPhase = startingFlow?.phase;
  const organizingPhase = organizingFlow?.phase;
  const messages = inStarting ? (startingFlow?.messages ?? []) : (organizingFlow?.messages ?? []);

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
    }
  }, [open]);

  useEffect(() => {
    if (!inChat) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, startingPhase, organizingPhase, inChat, typing]);

  const sendStartingBotReply = (
    text: string,
    typingMs = BOT_TYPING_MS,
    link?: { label: string; href: string }
  ) => {
    setTyping(true);
    schedule(() => {
      appendStartingMessages({ role: 'bot', text, ...(link ? { link } : {}) });
      setTyping(false);
    }, typingMs);
  };

  const sendOrganizingBotReply = (text: string, typingMs = BOT_TYPING_MS) => {
    setTyping(true);
    schedule(() => {
      appendOrganizingMessages({ role: 'bot', text });
      setTyping(false);
    }, typingMs);
  };

  const sendStartingOpeningSequence = (first: string, second: string) => {
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendStartingMessages({ role: 'bot', text: first });
      schedule(() => {
        appendStartingMessages({ role: 'bot', text: second });
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  };

  const sendOrganizingOpeningSequence = (first: string, second: string) => {
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendOrganizingMessages({ role: 'bot', text: first });
      schedule(() => {
        appendOrganizingMessages({ role: 'bot', text: second });
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  };

  useEffect(() => {
    if (!open || !postPrepResume || !startingFlow) return;
    clearPostPrepResume();
    sendStartingBotReply(STARTING_FLOW_COPY.qChunks);
  }, [open, postPrepResume, startingFlow, clearPostPrepResume]);

  useEffect(() => {
    if (!open || !inStarting || !startingPhase || STARTING_YES_PHASES.includes(startingPhase) || typing) return;
    if (!STARTING_COMPOSE_PHASES.includes(startingPhase)) return;
    inputRef.current?.focus();
  }, [open, inStarting, startingPhase, messages.length, typing]);

  useEffect(() => {
    if (!open || !inOrganizing || !organizingPhase || typing) return;
    if (!ORGANIZING_COMPOSE_PHASES.includes(organizingPhase)) return;
    inputRef.current?.focus();
  }, [open, inOrganizing, organizingPhase, messages.length, typing]);

  if (!open || typeof document === 'undefined') return null;

  const hide = () => closeStuckHelp();

  const backToPicker = () => {
    clearTimers();
    setTyping(false);
    clearStartingFlow();
    setDraft('');
    draftRef.current = '';
    flowFieldsRef.current = { importantTask: '', prepPlan: '', chunks: '' };
    organizingFieldsRef.current = { projectId: '', projectName: '', taskTexts: [], hardestTask: '' };
  };

  const pickPath = (id: StuckHelpPath) => {
    if (id === 'starting') {
      flowFieldsRef.current = { importantTask: '', prepPlan: '', chunks: '' };
      startStartingFlow();
      setDraft('');
      draftRef.current = '';
      sendStartingOpeningSequence(STARTING_FLOW_COPY.intro, STARTING_FLOW_COPY.q1);
      return;
    }
    if (id === 'organizing') {
      organizingFieldsRef.current = { projectId: '', projectName: '', taskTexts: [], hardestTask: '' };
      startOrganizingFlow();
      setDraft('');
      draftRef.current = '';
      sendOrganizingOpeningSequence(ORGANIZING_FLOW_COPY.intro, ORGANIZING_FLOW_COPY.qProject);
    }
  };

  const selectOrganizingProject = (project: ProjectBoard) => {
    if (typing) return;
    organizingFieldsRef.current.projectId = project.id;
    organizingFieldsRef.current.projectName = project.name.trim() || 'Unnamed project';
    setOrganizingFields({
      projectId: project.id,
      projectName: organizingFieldsRef.current.projectName,
    });
    appendOrganizingMessages({ role: 'user', text: organizingFieldsRef.current.projectName });
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.qMvp);
    setOrganizingPhase('await_mvp_tasks');
    setDraft('');
    draftRef.current = '';
  };

  const sendStartingDraft = () => {
    const text = draft.trim();
    if (!text || typing || !startingPhase) return;

    appendStartingMessages({ role: 'user', text });
    setDraft('');
    draftRef.current = '';

    if (startingPhase === 'await_task') {
      flowFieldsRef.current.importantTask = text;
      setStartingFields({ importantTask: text });
      const courseUrl = STARTING_FLOW_COPY.prepCourseUrl.trim();
      if (courseUrl) {
        sendStartingBotReply(STARTING_FLOW_COPY.q2, BOT_TYPING_MS, {
          label: STARTING_FLOW_COPY.q2CourseLinkLabel,
          href: courseUrl,
        });
      } else {
        sendStartingBotReply(STARTING_FLOW_COPY.q2 + STARTING_FLOW_COPY.q2CourseLinkLabel);
      }
      setStartingPhase('await_prep_plan');
      return;
    }

    if (startingPhase === 'await_prep_plan') {
      flowFieldsRef.current.prepPlan = text;
      setStartingFields({ prepPlan: text });
      sendStartingBotReply(STARTING_FLOW_COPY.prepReady);
      setStartingPhase('await_prep_yes');
      return;
    }

    if (startingPhase === 'await_chunks') {
      flowFieldsRef.current.chunks = text;
      setStartingFields({ chunks: text });
      sendStartingBotReply(STARTING_FLOW_COPY.chunkWorkReady);
      setStartingPhase('await_chunk_yes');
    }
  };

  const sendOrganizingDraft = () => {
    const text = draft.trim();
    if (!text || typing || !organizingPhase) return;

    if (organizingPhase === 'await_project') {
      const { projects: nextProjects, project } = upsertProject(projects, text);
      setProjects(nextProjects);
      selectOrganizingProject(project);
      return;
    }

    if (organizingPhase === 'await_mvp_tasks') {
      const projectId = organizingFlow?.projectId || organizingFieldsRef.current.projectId;
      if (!projectId) return;
      appendOrganizingMessages({ role: 'user', text });
      setProjects(prev => addProjectTask(prev, projectId, text));
      const nextTasks = [...(organizingFlow?.taskTexts ?? organizingFieldsRef.current.taskTexts), text];
      organizingFieldsRef.current.taskTexts = nextTasks;
      setOrganizingFields({ taskTexts: nextTasks });
      setDraft('');
      draftRef.current = '';
    }
  };

  const finishAddingTasks = () => {
    const tasks = organizingFlow?.taskTexts ?? organizingFieldsRef.current.taskTexts;
    if (!tasks.length || typing) return;
    appendOrganizingMessages({ role: 'user', text: ORGANIZING_FLOW_COPY.doneAddingTasks });
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.qHardest);
    setOrganizingPhase('await_hardest_pick');
  };

  const pickHardestTask = (task: string) => {
    if (typing) return;
    organizingFieldsRef.current.hardestTask = task;
    setOrganizingFields({ hardestTask: task });
    appendOrganizingMessages({ role: 'user', text: task });
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.prepManual);
    setOrganizingPhase('await_manual_prep');
  };

  const finishManualPrep = () => {
    if (typing) return;
    appendOrganizingMessages({ role: 'user', text: ORGANIZING_FLOW_COPY.donePrepping });
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.kickstartReady);
    setOrganizingPhase('await_kickstart_yes');
  };

  const sendStartingYes = () => {
    if (!startingPhase || !startingFlow) return;

    if (startingPhase === 'await_prep_yes') {
      if (typing) return;
      const task = (startingFlow.importantTask || flowFieldsRef.current.importantTask).trim();
      const prep = (startingFlow.prepPlan || flowFieldsRef.current.prepPlan).trim();
      if (!task || !prep) return;
      appendStartingMessages({ role: 'user', text: STARTING_FLOW_COPY.yesBegin });
      beginPrepTimer(task, prep);
      return;
    }

    if (startingPhase === 'await_chunk_yes') {
      if (typing || busy) return;
      const task = (startingFlow.importantTask || flowFieldsRef.current.importantTask).trim();
      const chunks = (startingFlow.chunks || flowFieldsRef.current.chunks).trim();
      if (!task || !chunks) return;
      appendStartingMessages({ role: 'user', text: STARTING_FLOW_COPY.yesBegin });
      beginWorkTimer(task, chunks);
    }
  };

  const sendOrganizingKickstart = () => {
    if (!organizingPhase || !organizingFlow || organizingPhase !== 'await_kickstart_yes') return;
    if (typing || busy) return;
    const projectName = (organizingFlow.projectName || organizingFieldsRef.current.projectName).trim();
    const hardest = (organizingFlow.hardestTask || organizingFieldsRef.current.hardestTask).trim();
    if (!projectName || !hardest) return;
    appendOrganizingMessages({ role: 'user', text: ORGANIZING_FLOW_COPY.kickstartYes });
    beginWorkTimer(projectName, hardest);
  };

  const sendDraft = () => {
    if (inStarting) sendStartingDraft();
    else if (inOrganizing) sendOrganizingDraft();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDraft();
    }
  };

  const showStartingCompose =
    inStarting && startingPhase
      ? STARTING_COMPOSE_PHASES.includes(startingPhase) && !typing
      : false;
  const showOrganizingCompose =
    inOrganizing && organizingPhase
      ? ORGANIZING_COMPOSE_PHASES.includes(organizingPhase) && !typing
      : false;
  const showCompose = showStartingCompose || showOrganizingCompose;

  const showStartingYes =
    inStarting && startingPhase ? STARTING_YES_PHASES.includes(startingPhase) && !typing : false;

  const projectOptions = projects.filter(p => p.name.trim());
  const organizingTasks = organizingFlow?.taskTexts ?? [];

  return createPortal(
    <>
      <style>{`
        @keyframes stuckHelpTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .stuck-help-typing-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin: 0 2px;
          border-radius: 50%;
          background: #8e8e93;
          animation: stuckHelpTypingBounce 1.2s infinite ease-in-out;
        }
      `}</style>
      <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && hide()}>
        {!inChat ? (
          <div style={styles.menuCard} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={hide} style={styles.menuClose} aria-label="Close">
              ✕
            </button>
            <div style={styles.optionList}>
              {STUCK_HELP_OPTIONS.map(option => {
                const available = option.id === 'starting' || option.id === 'organizing';
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!available}
                    onClick={() => pickPath(option.id)}
                    style={{
                      ...styles.optionBtn,
                      ...(!available ? styles.optionBtnDisabled : {}),
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={styles.shell} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <header style={styles.header}>
              <button type="button" onClick={backToPicker} style={styles.headerBack}>
                ←
              </button>
              <div style={styles.headerCenter}>
                <div style={styles.avatar}>b</div>
                <span style={styles.headerTitle}>bot</span>
              </div>
              <button type="button" onClick={hide} style={styles.headerClose} aria-label="Close">
                ✕
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
                    {msg.link ? (
                      <>
                        {' '}
                        <a
                          href={msg.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.bubbleLink}
                        >
                          {msg.link.label}
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              {typing ? <TypingBubble /> : null}
            </div>

            <footer style={styles.footer}>
              {inOrganizing && organizingPhase === 'await_project' && !typing ? (
                <div style={styles.chipWrap}>
                  {projectOptions.map(project => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => selectOrganizingProject(project)}
                      style={styles.chip}
                    >
                      {project.name.trim()}
                    </button>
                  ))}
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_hardest_pick' && !typing ? (
                <div style={styles.chipWrap}>
                  {organizingTasks.map(task => (
                    <button key={task} type="button" onClick={() => pickHardestTask(task)} style={styles.chip}>
                      {task}
                    </button>
                  ))}
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_mvp_tasks' && !typing && organizingTasks.length > 0 ? (
                <div style={styles.chipWrap}>
                  <button type="button" onClick={finishAddingTasks} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.doneAddingTasks}
                  </button>
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_manual_prep' && !typing ? (
                <div style={styles.chipWrap}>
                  <button type="button" onClick={finishManualPrep} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.donePrepping}
                  </button>
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_kickstart_yes' && !typing ? (
                <div style={styles.chipWrap}>
                  <button type="button" disabled={busy} onClick={sendOrganizingKickstart} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.kickstartYes}
                  </button>
                </div>
              ) : null}

              {showStartingYes ? (
                <div style={styles.chipWrap}>
                  <button type="button" disabled={busy} onClick={sendStartingYes} style={styles.chip}>
                    {STARTING_FLOW_COPY.yesBegin}
                  </button>
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
                      inOrganizing && organizingPhase === 'await_project'
                        ? ORGANIZING_FLOW_COPY.addNewProject
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
            </footer>
          </div>
        )}
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
  menuCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: '22px 20px',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
  },
  menuClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
    padding: 4,
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 8,
  },
  optionBtn: {
    textAlign: 'left',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#f8fafc',
    color: '#0f172a',
    cursor: 'pointer',
    lineHeight: 1.45,
  },
  optionBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
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
    color: '#007aff',
    fontSize: 18,
    fontWeight: 600,
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
  headerClose: {
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
  thread: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  msgRow: {
    display: 'flex',
    width: '100%',
  },
  msgRowBot: {
    justifyContent: 'flex-start',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
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
  bubbleLink: {
    color: '#007aff',
    fontWeight: 700,
    textDecoration: 'underline',
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 52,
    minHeight: 20,
    padding: '12px 14px',
  },
  userBubble: {
    background: '#007aff',
    color: '#fff',
    borderRadius: '18px 18px 4px 18px',
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
  chipWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
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
  sendBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
};
