'use client';

import { useState } from 'react';
import ChatTab from './ChatTab';
import DashboardTab from './DashboardTab';
import { useWorkTracker } from './hooks/useWorkTracker';

type Tab = 'chat' | 'dashboard';

export default function AgentHQ() {
  const [tab, setTab] = useState<Tab>('chat');
  const tracker = useWorkTracker();

  const statusColor =
    tracker.status === 'working'
      ? '#15803d'
      : tracker.status === 'on_break'
        ? '#b45309'
        : tracker.status === 'done'
          ? '#1d4ed8'
          : '#64748b';

  const font =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#f1f5f9',
        overflow: 'hidden',
        fontFamily: font,
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 24 }}>
          <div
            style={{
              width: 8,
              height: 8,
              background: statusColor,
              borderRadius: '50%',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#0f172a', fontSize: 17, fontWeight: 700 }}>Today</span>
        </div>

        {(
          [
            { id: 'chat' as const, label: 'Work log' },
            { id: 'dashboard' as const, label: 'Dashboard' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === id ? '#0f172a' : 'transparent'}`,
              color: tab === id ? '#0f172a' : '#64748b',
              fontFamily: font,
              fontSize: 15,
              fontWeight: tab === id ? 600 : 500,
              padding: '14px 14px 12px',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => {
            if (confirm('Reset today’s work timer, sessions, and accomplishments?')) tracker.resetDay();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontFamily: font,
            fontSize: 13,
            cursor: 'pointer',
            padding: '8px 4px',
          }}
        >
          Reset work day
        </button>
      </nav>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tab === 'chat' ? (
          <ChatTab
            workStatus={tracker.status}
            accomplishments={tracker.accomplishments}
            sessions={tracker.sessions}
            currentSession={tracker.currentSession}
            onStartWork={tracker.startWork}
            onBreak={tracker.startBreak}
            onResume={tracker.resumeWork}
            onStop={tracker.stopTracking}
            onAddAccomplishment={tracker.addAccomplishment}
            getTotals={tracker.getTotals}
          />
        ) : (
          <DashboardTab
            workStatus={tracker.status}
            currentSession={tracker.currentSession}
            getTotals={tracker.getTotals}
          />
        )}
      </div>
    </div>
  );
}
