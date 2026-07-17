'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useMorningFlow } from './hooks/MorningFlowProvider';
import { useUserProfile } from './hooks/UserProfileProvider';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useHoverTimer } from './hooks/HoverTimerProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { FocusLockMode } from './types';
import { sessionLabel } from './quickstartTask';
import {
  formatMorningTaskList,
  MORNING_FLOW_COPY,
  TIMER_PRESETS,
  type MorningTimerChoice,
} from './morningFlow/flows';
import {
  buildMorningFlowUsedRecord,
  MORNING_FLOW_USED_KEY,
  type MorningFlowUsedRecord,
} from './morningFlow/storage';
import { FOCUS_LOCK_MODE_COPY, FOCUS_LOCK_MODES } from './focusBlocking';
import {
  getActiveNightPrepPlan,
  NIGHT_PREP_PLAN_KEY,
  type NightPrepTomorrowPlan,
  type NightPrepTomorrowTask,
} from './nightPrep/storage';
import { welcomeLabel } from './userProfile';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BOT_TYPING_MS = 1300;

function TypingBubble() {
  return (
    <div style={{ ...styles.msgRow, ...styles.msgRowBot }}>
      <div style={{ ...styles.bubble, ...styles.botBubble, ...styles.typingBubble }}>
        <span className="morning-flow-typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="morning-flow-typing-dot" style={{ animationDelay: '150ms' }} />
        <span className="morning-flow-typing-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default function MorningFlowModal() {
  const {
    open,
    flow,
    closeMorningFlow,
    resetMorningFlow,
    setMorningFlowPhase,
    setMorningFlowFields,
    appendMorningFlowMessages,
  } = useMorningFlow();
  const { profile } = useUserProfile();
  const { startSession, status } = useWorkTrackerContext();
  const { requestOpen } = useHoverTimer();
  const [, setMorningFlowUsed] = useLocalStorage<MorningFlowUsedRecord | null>(MORNING_FLOW_USED_KEY, null);
  const [plan] = useLocalStorage<NightPrepTomorrowPlan | null>(NIGHT_PREP_PLAN_KEY, null);

  const [typing, setTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const openedRef = useRef(false);

  const phase = flow?.phase;
  const messages = flow?.messages ?? [];
  const tasks = flow?.tasks ?? [];
  const selectedTask = flow?.selectedTask ?? null;
  const timerChoice = flow?.timerChoice ?? null;
  const busy = status === 'working' || status === 'on_break';

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
      openedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !flow || openedRef.current) return;
    openedRef.current = true;
    clearTimers();
    setTyping(true);
    const taskLines = formatMorningTaskList(tasks);
    schedule(() => {
      appendMorningFlowMessages({ role: 'bot', text: welcomeLabel(profile.displayName) });
      schedule(() => {
        appendMorningFlowMessages({
          role: 'bot',
          text: MORNING_FLOW_COPY.introTaskList(taskLines),
        });
        setMorningFlowPhase('task_pick');
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  }, [open, flow, tasks, profile.displayName, appendMorningFlowMessages, setMorningFlowPhase]);

  useEffect(() => {
    if (!open) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, phase, open, typing]);

  const sendBotReply = (text: string, nextPhase?: typeof phase) => {
    setTyping(true);
    schedule(() => {
      appendMorningFlowMessages({ role: 'bot', text });
      if (nextPhase) setMorningFlowPhase(nextPhase);
      setTyping(false);
    }, BOT_TYPING_MS);
  };

  const startWork = (task: NightPrepTomorrowTask, choice: MorningTimerChoice, lockMode: FocusLockMode) => {
    if (busy) return;
    const label = sessionLabel(task.projectName, task.taskText);
    if (choice.kind === 'pomodoro') {
      startSession({
        project: label,
        type: 'pomodoro',
        pomodoroMinutes: choice.workMinutes,
        pomodoroBreakMinutes: choice.breakMinutes,
        lockMode,
      });
    } else {
      startSession({
        project: label,
        type: 'open',
        countdownTargetMs: choice.minutes * 60 * 1000,
        lockMode,
      });
    }
    requestOpen();
    const activePlan = getActiveNightPrepPlan(plan);
    if (activePlan) {
      setMorningFlowUsed(buildMorningFlowUsedRecord(activePlan));
    }
    setMorningFlowPhase('complete');
    closeMorningFlow();
  };

  const pickTask = (task: NightPrepTomorrowTask) => {
    if (typing || busy) return;
    setMorningFlowFields({ selectedTask: task });
    appendMorningFlowMessages({ role: 'user', text: task.taskText.trim() });
    sendBotReply(MORNING_FLOW_COPY.phoneConfirm, 'phone_confirm');
  };

  const confirmPhone = () => {
    if (typing || busy) return;
    appendMorningFlowMessages({ role: 'user', text: MORNING_FLOW_COPY.phoneConfirmYes });
    sendBotReply(MORNING_FLOW_COPY.chooseTimer, 'timer_pick');
  };

  const pickTimer = (choice: MorningTimerChoice, label: string) => {
    if (typing || busy || !selectedTask) return;
    setMorningFlowFields({ timerChoice: choice });
    appendMorningFlowMessages({ role: 'user', text: label });
    sendBotReply(MORNING_FLOW_COPY.chooseLock, 'lock_pick');
  };

  const pickLock = (lockMode: FocusLockMode, label: string) => {
    if (typing || busy || !selectedTask || !timerChoice) return;
    appendMorningFlowMessages({ role: 'user', text: label });
    startWork(selectedTask, timerChoice, lockMode);
  };

  const clearChat = () => {
    clearTimers();
    setTyping(false);
    openedRef.current = false;
    resetMorningFlow(tasks);
  };

  if (!open || !flow || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <style>{`
        @keyframes morningFlowTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .morning-flow-typing-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin: 0 2px;
          border-radius: 50%;
          background: #8e8e93;
          animation: morningFlowTypingBounce 1.2s infinite ease-in-out;
        }
      `}</style>
      <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && closeMorningFlow()}>
        <div style={styles.shell} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <header style={styles.header}>
            <button type="button" onClick={closeMorningFlow} style={styles.headerBack}>
              ✕
            </button>
            <div style={styles.headerCenter}>
              <div style={styles.avatar}>b</div>
              <span style={styles.headerTitle}>{MORNING_FLOW_COPY.headerTitle}</span>
            </div>
            <button type="button" onClick={clearChat} style={styles.headerClear}>
              {MORNING_FLOW_COPY.clearChat}
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
            {busy ? <p style={styles.errorText}>{MORNING_FLOW_COPY.busy}</p> : null}

            {phase === 'task_pick' && !typing ? (
              <div style={styles.chipWrap}>
                {tasks.map(task => (
                  <button
                    key={`${task.projectId}:${task.taskId}`}
                    type="button"
                    disabled={busy}
                    onClick={() => pickTask(task)}
                    style={{
                      ...styles.chip,
                      ...(busy ? styles.chipDisabled : {}),
                    }}
                  >
                    {task.taskText.trim()}
                    {task.projectName.trim() ? (
                      <span style={styles.chipMeta}> · {task.projectName.trim()}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {phase === 'phone_confirm' && !typing ? (
              <div style={styles.chipWrap}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmPhone}
                  style={{
                    ...styles.chip,
                    ...(busy ? styles.chipDisabled : {}),
                  }}
                >
                  {MORNING_FLOW_COPY.phoneConfirmYes}
                </button>
              </div>
            ) : null}

            {phase === 'timer_pick' && !typing ? (
              <div style={styles.chipWrap}>
                {TIMER_PRESETS.map(min => (
                  <button
                    key={min}
                    type="button"
                    disabled={busy}
                    onClick={() => pickTimer({ kind: 'countdown', minutes: min }, `${min}m`)}
                    style={{
                      ...styles.chip,
                      ...(busy ? styles.chipDisabled : {}),
                    }}
                  >
                    {min}m
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    pickTimer({ kind: 'pomodoro', workMinutes: 25, breakMinutes: 5 }, 'Pomodoro')
                  }
                  style={{
                    ...styles.chip,
                    ...(busy ? styles.chipDisabled : {}),
                  }}
                >
                  Pomodoro
                </button>
              </div>
            ) : null}

            {phase === 'lock_pick' && !typing ? (
              <div style={styles.chipWrap}>
                {FOCUS_LOCK_MODES.map(mode => (
                  <button
                    key={mode}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      pickLock(mode, `${FOCUS_LOCK_MODE_COPY[mode].label} — ${FOCUS_LOCK_MODE_COPY[mode].hint}`)
                    }
                    style={{
                      ...styles.chip,
                      ...(busy ? styles.chipDisabled : {}),
                    }}
                  >
                    {FOCUS_LOCK_MODE_COPY[mode].label}
                    <span style={styles.chipMeta}> · {FOCUS_LOCK_MODE_COPY[mode].hint}</span>
                  </button>
                ))}
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
    background: '#16a34a',
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
    background: '#16a34a',
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
  chip: {
    textAlign: 'center',
    border: '1px solid #16a34a',
    borderRadius: 18,
    padding: '9px 13px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#15803d',
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  chipMeta: {
    fontWeight: 500,
    opacity: 0.75,
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
};
