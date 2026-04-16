'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { ChatMessage, WorkSession, WorkStatus } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { parseInfractionCommand } from './infractions';

const WORK_TRACKING_HELP = `Work timer — send one line at a time:

• Start work — e.g. "starting work", "starting work now", "beginning work", "working", "clock in", "resume" / "starting work" after a break
• Break — e.g. "break", "taking a break", "taking break", "taking break now"
• End break — e.g. "stop break", "end break", "resume", "back", or "done" / "finished" while on a break
• Stop work — e.g. "stop work", "done working", "finished", "finished working", "done", "clock out", …
• Infraction — e.g. "infraction - phone" (logged on your Dashboard with a tally)

Optional: "EOD report" for a quick time summary. To log a win: "shipped …", "fixed …", etc.`;

type ParsedCommand =
  | 'START_WORK'
  | 'BREAK'
  | 'RESUME'
  | 'STOP'
  | 'EOD'
  | { type: 'ACCOMPLISH'; item: string }
  | null;

function parseCommand(input: string, workStatus: WorkStatus): ParsedCommand {
  const t = input.trim();
  if (!t) return null;

  const lower = t.toLowerCase();

  // End break / resume — before generic "break" so "stop break" is not parsed as start a break
  if (
    /\b(stop break|end break|break'?s over|break is over|over break)\b/i.test(t) ||
    /\b(back|i'?m back|back from break|resume|resume work|continue work|back to work)\b/i.test(t) ||
    /^\s*(starting work now|starting work|beginning work|begin work)\b/i.test(t)
  ) {
    return 'START_WORK';
  }

  // Start a break ("on break" omitted — avoids "not on break" false positives)
  if (
    /\b(taking\s+a?\s*break|taking break now|taking break|brb|stepping out|pause( my)? work)\b/i.test(t) ||
    /^\s*break\s*[.!]?\s*$/i.test(t.trim())
  ) {
    return 'BREAK';
  }

  // Stop work session — explicit phrases (working or on_break ends the tracked session)
  if (
    /\b(stop work|stop working|stopping work|end work|ending work|quit work|quitting work)\b/i.test(t) ||
    /\b(done working|finished working|finished for (the )?day|done for (the )?day|clock(ing)? out|signing off|sign off|wrap(ping)? up|that'?s a wrap|end (of )?(my )?work|calling it (a )?day)\b/i.test(
      t
    ) ||
    /^\s*(finished|done)\s+working\s*[.!]?\s*$/i.test(t)
  ) {
    if (workStatus === 'working' || workStatus === 'on_break') return 'STOP';
    return null;
  }

  // "I'm done" / "I'm finished" — on a break, treat as end break; while working, end session
  if (/\b(i'?m|i am)\s+(done|finished)(\s+with\s+(work|this))?\b/i.test(t)) {
    if (workStatus === 'on_break') return 'RESUME';
    if (workStatus === 'working') return 'STOP';
    return null;
  }

  // Lone "done" / "finished"
  if (/^\s*(finished|done)\s*[.!]?\s*$/i.test(t)) {
    if (workStatus === 'on_break') return 'RESUME';
    if (workStatus === 'working') return 'STOP';
    return null;
  }

  // Start work — mid-sentence phrasing (line-leading "starting work" / "begin work" is in resume block above)
  if (
    /\b(start work|start my work|start(ing)? work(\s+now)?|begin(ning)? work|commence work|clock(ing)? in|let'?s work|deep work|on the clock|time to work|going to work|getting to work|i'?m starting work|im starting work|i'?m beginning work|getting started)\b/i.test(
      t
    ) ||
    /^\s*working\s*[.!]?\s*$/i.test(t) ||
    /^\s*i'?m\s+working\s*[.!]?\s*$/i.test(t)
  ) {
    return 'START_WORK';
  }

  if (/\beod( report)?\b|end of day( report)?\b/i.test(lower)) return 'EOD';

  const m = t.match(
    /(?:^|\s)(shipped|sent|fixed|built|published|completed|wrapped up|launched|closed)\s+(.+)/i
  );
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
      : '  (none — log wins with e.g. "shipped …")';

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
  onAddInfraction: (categoryKey: string, label: string) => void;
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
  onAddInfraction,
  getTotals,
}: ChatTabProps) {
  void _currentSession;
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('agentHQ_messages', []);
  const [input, setInput] = useState('');
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

  function clearChat() {
    if (!confirm('Clear all messages in this work log?')) return;
    setMessages([
      {
        id: makeId(),
        role: 'agent',
        content: WORK_TRACKING_HELP,
        timestamp: Date.now(),
        variant: 'command',
      },
    ]);
  }

  useEffect(() => {
    if (messages.length === 0) {
      pushAgentMsg(WORK_TRACKING_HELP, 'command');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    pushUserMsg(text);

    const infParsed = parseInfractionCommand(text);
    if (infParsed) {
      onAddInfraction(infParsed.categoryKey, infParsed.label);
      pushAgentMsg(
        `Logged infraction — ${infParsed.label}. Open the Dashboard to see totals and your top category.`,
        'command'
      );
      return;
    }

    const cmd = parseCommand(text, workStatus);
    const displayName = 'You';

    if (cmd === 'BREAK') {
      if (workStatus !== 'working') {
        pushAgentMsg(
          workStatus === 'on_break'
            ? 'You are already on a break. Say "resume" or "start work" when you are ready to work again.'
            : 'Start work first (e.g. say "start work"), then you can take a break.',
          'command'
        );
        return;
      }
      onBreak();
      pushAgentMsg(
        'Break timer started. Work timer paused.\n\nWhen you are done, say "stop break", "resume", "back", "done", or "starting work".',
        'command'
      );
      return;
    }

    if (cmd === 'STOP') {
      if (workStatus !== 'working' && workStatus !== 'on_break') {
        pushAgentMsg('Nothing is running right now. Say "starting work" or "working" to begin tracking.', 'command');
        return;
      }
      onStop();
      pushAgentMsg(
        'Workday timer stopped.\n\nSay "starting work" or "working" when you want to track again, or "EOD report" for a summary.',
        'command'
      );
      return;
    }

    if (cmd === 'START_WORK' || cmd === 'RESUME') {
      if (workStatus === 'working') {
        pushAgentMsg('You are already in a work session. Say "break" for a break, or "stop work" / "done" / "finished working" to stop.', 'command');
        return;
      }
      if (workStatus === 'on_break') {
        onResume();
        pushAgentMsg('Back to work — work timer is running again.', 'command');
        return;
      }
      onStartWork();
      pushAgentMsg(
        'Work timer started.\n\nSay "break" when you step away, or "stop work", "done", or "finished working" when you stop for now.',
        'command'
      );
      return;
    }

    if (cmd === 'EOD') {
      const { workMs, breakMs } = getTotals(workStatus !== 'done');
      const report = buildEODReport(sessions, accomplishments, workMs, breakMs, displayName);
      pushAgentMsg(report, 'report');
      return;
    }

    if (cmd !== null && typeof cmd === 'object' && cmd.type === 'ACCOMPLISH') {
      onAddAccomplishment(cmd.item);
      pushAgentMsg(`Logged: ${cmd.item}`, 'command');
      return;
    }

    pushAgentMsg(
      'I only handle timer commands, infractions (e.g. "infraction - phone"), EOD report, or a win like "shipped …". Try one of those, or check the tips at the top of this chat.',
      'command'
    );
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  const placeholder =
    workStatus === 'idle' || workStatus === 'done'
      ? 'Try: starting work, working…'
      : workStatus === 'on_break'
        ? 'Try: stop break, resume, done…'
        : 'Try: break, stop work, done, infraction - …';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000000',
        fontFamily: font,
        color: '#e5e5e5',
      }}
    >
      <div
        style={{
          padding: '8px 18px',
          borderBottom: '1px solid #262626',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#0a0a0a',
          flexShrink: 0,
        }}
      >
        <span style={{ color: statusColor, fontSize: 13, fontWeight: 600 }}>{statusLabel}</span>
        {workStatus === 'working' && (
          <span style={{ color: '#737373', fontSize: 12 }}>{formatDuration(workMs)} tracked</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={clearChat}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a3a3a3',
              fontFamily: font,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 0',
            }}
          >
            Clear chat
          </button>
          <span style={{ color: '#525252', fontSize: 12 }}>Work log</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 22px', background: '#000000' }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '10px 18px 14px',
          borderTop: '1px solid #262626',
          display: 'flex',
          gap: 8,
          background: '#0a0a0a',
          flexShrink: 0,
        }}
      >
        <input
          className="chat-log-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: '#141414',
            border: '1px solid #333333',
            borderRadius: 8,
            color: '#e5e5e5',
            fontFamily: font,
            fontSize: 14,
            lineHeight: 1.45,
            padding: '10px 12px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim()}
          style={{
            background: !input.trim() ? '#1f1f1f' : '#e5e5e5',
            color: !input.trim() ? '#525252' : '#0a0a0a',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontFamily: font,
            fontSize: 13,
            fontWeight: 600,
            cursor: !input.trim() ? 'not-allowed' : 'pointer',
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
      return 'Note';
    default:
      return 'Assistant';
  }
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.role === 'agent';
  const label = isAgent ? bubbleLabel(message.variant) : null;
  const isUser = message.role === 'user';

  const bubbleBg = isUser ? '#171717' : '#141414';
  const border = isUser ? '1px solid #2e2e2e' : '1px solid #262626';
  const textColor = '#d4d4d4';

  return (
    <div
      style={{
        marginBottom: 12,
        width: '100%',
        display: 'flex',
        flexDirection: isAgent ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: 10,
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
          borderRadius: 10,
          padding: '11px 14px',
          boxShadow: 'none',
        }}
      >
        {label && (
          <div
            style={{
              color: '#737373',
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 6,
              letterSpacing: 0.03,
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            color: textColor,
            fontSize: message.variant === 'report' ? 12 : 14,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
        <div style={{ color: '#525252', fontSize: 11, marginTop: 6 }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
