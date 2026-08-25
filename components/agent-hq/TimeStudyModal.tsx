'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { onTimeStudyAck, pingFocusExtension, postTimeStudySync } from './focusBlocking';
import {
  DEFAULT_TIME_STUDY_SETTINGS,
  TIME_STUDY_CHECKINS_KEY,
  TIME_STUDY_INTERVAL_OPTIONS,
  TIME_STUDY_SETTINGS_KEY,
  formatCheckInTime,
  formatTimeStudyIntervalLabel,
  normalizeTimeStudyCheckInsStore,
  normalizeTimeStudySettings,
  type TimeStudyCheckInsStore,
  type TimeStudySettings,
} from './timeStudy';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface TimeStudyModalProps {
  variant?: 'default' | 'nav';
}

export default function TimeStudyModal({ variant = 'default' }: TimeStudyModalProps) {
  const [open, setOpen] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const { status, timerPaused } = useWorkTrackerContext();
  const sessionActive = status === 'working' && !timerPaused;
  const [rawSettings, setRawSettings] = useLocalStorage<TimeStudySettings>(
    TIME_STUDY_SETTINGS_KEY,
    DEFAULT_TIME_STUDY_SETTINGS
  );
  const [rawCheckIns] = useLocalStorage<TimeStudyCheckInsStore>(TIME_STUDY_CHECKINS_KEY, {
    dayStartMs: 0,
    items: [],
  });

  const settings = useMemo(() => normalizeTimeStudySettings(rawSettings), [rawSettings]);
  const checkIns = useMemo(() => normalizeTimeStudyCheckInsStore(rawCheckIns), [rawCheckIns]);

  useEffect(() => {
    if (!open) return;
    setExtensionConnected(false);
    return pingFocusExtension(() => setExtensionConnected(true));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return onTimeStudyAck(payload => {
      if (!payload.pingNow) return;
      if (payload.overlay) {
        setPingStatus('Check-in card shown — click Enter task, type, then press Enter to save.');
      } else if (payload.error) {
        setPingStatus(payload.error);
      } else {
        setPingStatus('Ping sent. If you don’t see the type box, reload the extension and try again.');
      }
    });
  }, [open]);

  useEffect(() => {
    postTimeStudySync({
      enabled: settings.enabled,
      intervalMinutes: settings.intervalMinutes,
      sessionActive,
    });
  }, [settings.enabled, settings.intervalMinutes, sessionActive]);

  const setEnabled = (enabled: boolean) => {
    setRawSettings(prev => ({ ...normalizeTimeStudySettings(prev), enabled }));
  };

  const setIntervalMinutes = (intervalMinutes: number) => {
    setRawSettings(prev => ({ ...normalizeTimeStudySettings(prev), intervalMinutes }));
  };

  const sendTestPing = () => {
    if (!extensionConnected) {
      setPingStatus(
        'Extension not connected. Reload Daywinner bot on chrome://extensions, then hard-refresh this page (Cmd+Shift+R).'
      );
      return;
    }
    if (!sessionActive) {
      setPingStatus('Start a focus session first — pings only run while the focus timer is active.');
      return;
    }
    setPingStatus('Sending ping to extension…');
    postTimeStudySync({
      enabled: true,
      intervalMinutes: settings.intervalMinutes,
      sessionActive: true,
      pingNow: true,
    });
  };

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div style={styles.backdrop} onClick={() => setOpen(false)} role="presentation">
            <div
              style={styles.panel}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="time-study-title"
            >
              <div style={styles.panelHeader}>
                <h3 id="time-study-title" style={styles.panelTitle}>
                  Time study check-ins
                </h3>
                <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close">
                  ×
                </button>
              </div>

              <p style={styles.lead}>
                When on, Daywinner shows a check-in card during an <strong>active focus session</strong>. Click{' '}
                <strong>Enter task</strong>, type in that same card, press <strong>Enter</strong> to save to today’s
                EOD. No pings on break or when the timer is off/paused.
              </p>

              <label style={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => setEnabled(e.target.checked)}
                />
                <span style={styles.toggleLabel}>Enable time study check-ins</span>
              </label>

              <div style={styles.section}>
                <div style={styles.sectionLabel}>Interval</div>
                <select
                  value={settings.intervalMinutes}
                  onChange={e => setIntervalMinutes(Number(e.target.value))}
                  disabled={!settings.enabled}
                  style={styles.select}
                >
                  {TIME_STUDY_INTERVAL_OPTIONS.map(mins => (
                    <option key={mins} value={mins}>
                      {formatTimeStudyIntervalLabel(mins)}
                    </option>
                  ))}
                </select>
                <p style={styles.hint}>
                  {extensionConnected
                    ? 'Extension connected.'
                    : 'Extension not detected — reload the extension, then hard-refresh this page (Cmd+Shift+R).'}
                </p>
                {settings.enabled ? (
                  <button type="button" style={styles.testBtn} onClick={sendTestPing}>
                    Send test ping now
                  </button>
                ) : null}
                {pingStatus ? <p style={styles.pingStatus}>{pingStatus}</p> : null}
              </div>

              <div style={styles.section}>
                <div style={styles.sectionLabel}>Today&apos;s check-ins ({checkIns.items.length})</div>
                {checkIns.items.length === 0 ? (
                  <p style={styles.empty}>None yet — turn it on and wait for the next ping.</p>
                ) : (
                  <ul style={styles.list}>
                    {[...checkIns.items].reverse().map(item => (
                      <li key={item.id} style={styles.listItem}>
                        <span style={styles.listTime}>{formatCheckInTime(item.createdAt)}</span>
                        <span style={styles.listText}>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button type="button" onClick={() => setOpen(false)} style={styles.doneBtn}>
                Done
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={variant === 'nav' ? styles.navTriggerBtn : styles.triggerBtn}
      >
        time study
      </button>
      {modal}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  triggerBtn: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#475569',
    background: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  navTriggerBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 999,
    padding: '6px 11px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#475569',
    background: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  panel: {
    width: 'min(100%, 420px)',
    maxHeight: 'min(90vh, 720px)',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    lineHeight: 1,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
  },
  lead: {
    margin: '0 0 16px',
    fontSize: 13,
    lineHeight: 1.45,
    color: '#64748b',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    cursor: 'pointer',
  },
  toggleLabel: {
    fontFamily: font,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 8,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
    background: '#fff',
  },
  hint: {
    margin: '8px 0 0',
    fontSize: 12,
    lineHeight: 1.4,
    color: '#94a3b8',
  },
  pingStatus: {
    margin: '8px 0 0',
    fontSize: 12,
    lineHeight: 1.4,
    color: '#b45309',
  },
  testBtn: {
    marginTop: 10,
    appearance: 'none',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#f8fafc',
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  empty: {
    margin: 0,
    fontSize: 13,
    color: '#94a3b8',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 220,
    overflowY: 'auto',
  },
  listItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'baseline',
    padding: '8px 10px',
    borderRadius: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  listTime: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    color: '#0f766e',
    minWidth: 58,
  },
  listText: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  doneBtn: {
    width: '100%',
    marginTop: 4,
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    background: '#0f172a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
  },
};
