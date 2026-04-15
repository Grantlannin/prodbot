'use client';

import { useState, useEffect, useRef, CSSProperties, type KeyboardEvent } from 'react';
import { ChatMessage, WorkSession, WorkStatus } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';

const FIRST_ORCHESTRATOR_MESSAGE =
  'Initialized. I am your AI Performance Orchestrator. To tailor this system to you, we must first build your `USER CONTEXT PROFILE` and operating protocols. Let\'s begin.\n\nFirst, what name should I call you?';

const CMD = {
  START_WORK:
    /\b(working now|start(ing)? work|on the clock|let'?s go|go time|clocking in|i'?m working|starting now|begin work)\b/i,
  BREAK:
    /\b(break(ing)?|taking a break|brb|stepping (away|out)|step(ping)? out)\b/i,
  RESUME: /\b(back|i'?m back|returning|back from break|resuming|back at it|let'?s go again)\b/i,
  STOP: /\b(done(?: working)?|clocking out|wrapping up|finished for (the )?day|signing off|that'?s (it|a wrap)|end of (the )?day|shutting down)\b/i,
  EOD: /\beod( report)?\b|end of day( report)?\b/i,
  ACCOMPLISH:
    /(?:^|\s)(finished|completed|done with|wrapped up|shipped|launched|built|wrote|sent|closed|fixed|solved|delivered|published)\s+(.+)/i,
};

type ParsedCommand =
  | 'START_WORK'
  | 'BREAK'
  | 'RESUME'
  | 'STOP'
  | 'EOD'
  | { type: 'ACCOMPLISH'; item: string }
  | null;

function parseCommand(input: string): ParsedCommand {
  if (CMD.START_WORK.test(input)) return 'START_WORK';
  if (CMD.BREAK.test(input)) return 'BREAK';
  if (CMD.RESUME.test(input)) return 'RESUME';
  if (CMD.STOP.test(input)) return 'STOP';
  if (CMD.EOD.test(input)) return 'EOD';
  const m = input.match(CMD.ACCOMPLISH);
  if (m) return { type: 'ACCOMPLISH', item: m[2].trim() };
  return null;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildEODReport(
  sessions: WorkSession[],
  accomplishments: string[],
  workMs: number,
  breakMs: number,
  title: string
): string {
  const sessionLines = sessions
    .map(s => {
      const dur = formatDuration((s.end ?? Date.now()) - s.start);
      const label = s.type === 'work' ? 'Work' : 'Break';
      const end = s.end ? formatTime(s.end) : 'in progress';
      return `  • ${label}: ${formatTime(s.start)} – ${end} (${dur})`;
    })
    .join('\n');

  const accomplishLines =
    accomplishments.length > 0
      ? accomplishments.map(a => `  • ${a}`).join('\n')
      : '  (none — you can log wins with phrases like "finished …")';

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `End of day summary — ${date}

Work time: ${formatDuration(workMs)}
Break time: ${formatDuration(breakMs)}
Total (work + break): ${formatDuration(workMs + breakMs)}

Sessions
${sessionLines || '  No sessions recorded.'}

Accomplishments
${accomplishLines}

— ${title}`;
}

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface ChatTabProps {
  workStatus: WorkStatus;
  accomplishments: string[];
  sessions: WorkSession[];
  currentSession: WorkSession | null;
  onStartWork: () => void;
  onBreak: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddAccomplishment: (text: string) => void;
  getTotals: (includeRunning?: boolean) => { workMs: number; breakMs: number };
}

export default function ChatTab({
  workStatus,
  accomplishments,
  sessions,
  currentSession: _currentSession,
  onStartWork,
  onBreak,
  onResume,
  onStop,
  onAddAccomplishment,
  getTotals,
}: ChatTabProps) {
  void _currentSession;
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('agentHQ_messages', []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function pushAgentMsg(content: string, variant?: ChatMessage['variant']): ChatMessage {
    const msg: ChatMessage = { id: makeId(), role: 'agent', content, timestamp: Date.now(), variant };
    setMessages(prev => [...prev, msg]);
    return msg;
  }

  function pushUserMsg(content: string): ChatMessage {
    const msg: ChatMessage = { id: makeId(), role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }

  useEffect(() => {
    if (messages.length === 0) {
      pushAgentMsg(FIRST_ORCHESTRATOR_MESSAGE, 'seed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function callOrchestrator(history: ChatMessage[]): Promise<string> {
    const payload = history
      .filter(m => m.variant !== 'seed')
      .map(({ role, content, variant }) => ({ role, content, variant }));

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payload.slice(-24),
          context: {
            workStatus,
            accomplishments,
            currentDate: new Date().toString(),
          },
        }),
      });
      const data = await res.json();
      return (data.content as string) || 'I did not get a clear reply. Try again.';
    } catch {
      return 'Network error. Check your connection and try again.';
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');

    const userMsg = pushUserMsg(text);
    setIsTyping(true);

    try {
      const cmd = parseCommand(text);
      const displayName = messages.find(m => m.role === 'user')?.content?.trim() || 'You';

      if (cmd === 'START_WORK') {
        onStartWork();
        pushAgentMsg(
          `Work timer started. When you finish something, you can log it with a phrase like "finished …".`,
          'command'
        );
      } else if (cmd === 'BREAK') {
        onBreak();
        pushAgentMsg(`Break timer started. Say "back" when you are ready to resume work.`, 'command');
      } else if (cmd === 'RESUME') {
        onResume();
        pushAgentMsg(`Work timer resumed.`, 'command');
      } else if (cmd === 'STOP') {
        onStop();
        pushAgentMsg(`Work timer stopped. Say "EOD report" if you want a quick local summary of time and accomplishments.`, 'command');
      } else if (cmd === 'EOD') {
        const { workMs, breakMs } = getTotals(workStatus !== 'done');
        const report = buildEODReport(sessions, accomplishments, workMs, breakMs, displayName);
        pushAgentMsg(report, 'report');
      } else if (cmd !== null && typeof cmd === 'object' && cmd.type === 'ACCOMPLISH') {
        onAddAccomplishment(cmd.item);
        pushAgentMsg(`Logged accomplishment: "${cmd.item}".`, 'command');
      } else {
        const historyForModel = [...messages, userMsg];
        const reply = await callOrchestrator(historyForModel);
        pushAgentMsg(reply);
      }
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const statusConfig: Record<WorkStatus, { label: string; color: string }> = {
    idle: { label: 'Idle', color: '#64748b' },
    working: { label: 'Working', color: '#15803d' },
    on_break: { label: 'On break', color: '#b45309' },
    done: { label: 'Done for now', color: '#1d4ed8' },
  };
  const { label: statusLabel, color: statusColor } = statusConfig[workStatus];

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;
  const { workMs } = getTotals(true);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#f8fafc',
        fontFamily: font,
      }}
    >
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <span style={{ color: statusColor, fontSize: 14, fontWeight: 600 }}>{statusLabel}</span>
        {workStatus === 'working' && (
          <span style={{ color: '#64748b', fontSize: 14 }}>{formatDuration(workMs)} tracked</span>
        )}
        <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 13 }}>Chat</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>Assistant is typing…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: 10,
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          placeholder={
            workStatus === 'idle'
              ? 'Reply to the orchestrator, or say "working now" to start the timer…'
              : 'Message the orchestrator…'
          }
          style={{
            flex: 1,
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            color: '#0f172a',
            fontFamily: font,
            fontSize: 16,
            lineHeight: 1.45,
            padding: '12px 14px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isTyping || !input.trim()}
          style={{
            background: isTyping || !input.trim() ? '#e2e8f0' : '#0f172a',
            color: isTyping || !input.trim() ? '#94a3b8' : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontFamily: font,
            fontSize: 15,
            fontWeight: 600,
            cursor: isTyping || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function bubbleLabel(variant: ChatMessage['variant']): string | null {
  switch (variant) {
    case 'command':
      return 'Timer';
    case 'report':
      return 'Summary';
    case 'seed':
      return 'Orchestrator';
    default:
      return 'Assistant';
  }
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.role === 'agent';
  const label = isAgent ? bubbleLabel(message.variant) : null;
  const isUser = message.role === 'user';

  const bubbleBg = isUser ? '#e2e8f0' : '#ffffff';
  const border = isUser ? '1px solid #cbd5e1' : '1px solid #e2e8f0';
  const textColor = '#0f172a';

  return (
    <div
      style={{
        marginBottom: 14,
        width: '100%',
        display: 'flex',
        flexDirection: isAgent ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: 12,
        fontFamily: font,
      }}
    >
      <div
        style={{
          maxWidth: 'min(100%, 720px)',
          marginLeft: isUser ? 'auto' : 0,
          marginRight: isAgent ? 'auto' : 0,
          background: bubbleBg,
          border,
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: isAgent ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
        }}
      >
        {label && (
          <div
            style={{
              color: '#64748b',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
              letterSpacing: 0.02,
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            color: textColor,
            fontSize: message.variant === 'report' ? 14 : 16,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
