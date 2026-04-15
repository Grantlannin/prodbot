'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { ChatMessage, WorkSession, WorkStatus } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';

const WORK_TRACKING_HELP = `Work timer — send one line at a time:

• Start work — e.g. "start work", "starting work", "clock in", "begin work"
• Break — e.g. "break", "taking a break"
• Done for now — e.g. "done working", "finished working", or just "finished" / "done" while you are working
• Back from break — e.g. "resume", "back", or "finished" / "done" while you are on a break

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

  // Break first (so "take a break" wins over "take")
  if (
    /\b(break|on break|taking a break|brb|stepping out|pause( my)? work)\b/i.test(t) ||
    /^break$/i.test(t.trim())
  ) {
    return 'BREAK';
  }

  // Explicit end-of-work phrases (always stop session)
  if (
    /\b(done working|finished working|finished for (the )?day|done for (the )?day|clock(ing)? out|signing off|wrap(ping)? up|that'?s a wrap|end (of )?(my )?work|calling it (a )?day)\b/i.test(
      t
    )
  ) {
    return 'STOP';
  }

  // Lone "finished" / "done" — depends on state
  if (/^\s*(finished|done)\s*[.!]?\s*$/i.test(t)) {
    if (workStatus === 'on_break') return 'RESUME';
    if (workStatus === 'working') return 'STOP';
    return null;
  }

  // Start / resume work
  if (
    /\b(start(ing)? work|start work|clock(ing)? in|begin work|let'?s work|deep work|on the clock|time to work|commence work)\b/i.test(
      t
    ) ||
    /\b(back|i'?m back|back from break|resume|resume work|continue work|back to work)\b/i.test(t)
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
        'Break timer started. Work timer paused.\n\nWhen you are done with your break, say "resume", "back", or "finished".',
        'command'
      );
      return;
    }

    if (cmd === 'STOP') {
      if (workStatus !== 'working' && workStatus !== 'on_break') {
        pushAgentMsg('Nothing is running right now. Say "start work" to begin tracking.', 'command');
        return;
      }
      onStop();
      pushAgentMsg(
        'Workday timer stopped.\n\nSay "start work" when you want to track again, or "EOD report" for a summary.',
        'command'
      );
      return;
    }

    if (cmd === 'START_WORK' || cmd === 'RESUME') {
      if (workStatus === 'working') {
        pushAgentMsg('You are already in a work session. Say "break" for a break, or "done working" to stop.', 'command');
        return;
      }
      if (workStatus === 'on_break') {
        onResume();
        pushAgentMsg('Back to work — work timer is running again.', 'command');
        return;
      }
      onStartWork();
      pushAgentMsg(
        'Work timer started.\n\nSay "break" when you step away, or "done working" when you are finished for now.',
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
      'I only handle timer commands right now (start work, break, resume, done working, EOD report, or a win like "shipped …"). Try one of those, or check the tips at the top of this chat.',
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
      ? 'Try: start work…'
      : workStatus === 'on_break'
        ? 'Try: resume, back, or finished…'
        : 'Try: break, done working, shipped …';

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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={clearChat}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontFamily: font,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 0',
            }}
          >
            Clear chat
          </button>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Work log</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
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
          placeholder={placeholder}
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
          onClick={() => handleSend()}
          disabled={!input.trim()}
          style={{
            background: !input.trim() ? '#e2e8f0' : '#0f172a',
            color: !input.trim() ? '#94a3b8' : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontFamily: font,
            fontSize: 15,
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
