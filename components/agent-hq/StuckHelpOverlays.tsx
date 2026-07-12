'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { fireCelebrationConfetti } from './celebrationEffects';
import { useStuckHelp } from './hooks/StuckHelpProvider';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { KICKSTART_DURATION_PRESETS, STARTING_FLOW_COPY } from './stuckHelp/flows';
import type { FocusLockMode } from './types';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function formatCountdown(ms: number | null): string {
  if (ms == null) return '5:00';
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function StuckHelpOverlays() {
  const {
    prepOverlayOpen,
    finishPrepTimer,
    cancelPrepTimer,
    workCompleteOpen,
    workLoggedOpen,
    extendWorkSession,
    endWorkSession,
    dismissWorkLogged,
  } = useStuckHelp();
  const { openCountdownLeft } = useWorkTrackerContext();
  const [extendMinutes, setExtendMinutes] = useState(25);
  const [extendLockMode, setExtendLockMode] = useState<FocusLockMode>('soft');
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [prepStopConfirmOpen, setPrepStopConfirmOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!prepOverlayOpen) {
      setPrepStopConfirmOpen(false);
      return;
    }
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [prepOverlayOpen]);

  useEffect(() => {
    if (workCompleteOpen) {
      fireCelebrationConfetti();
      setShowDurationPicker(false);
      setExtendLockMode('soft');
    }
  }, [workCompleteOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {prepOverlayOpen ? (
        <div style={styles.prepFloat}>
          {prepStopConfirmOpen ? (
            <div style={styles.prepConfirm}>
              <p style={styles.prepConfirmText}>{STARTING_FLOW_COPY.prepStopConfirm}</p>
              <div style={styles.prepConfirmActions}>
                <button
                  type="button"
                  onClick={() => {
                    setPrepStopConfirmOpen(false);
                    cancelPrepTimer();
                  }}
                  style={styles.prepConfirmYes}
                >
                  {STARTING_FLOW_COPY.prepStopYes}
                </button>
                <button
                  type="button"
                  onClick={() => setPrepStopConfirmOpen(false)}
                  style={styles.prepConfirmNo}
                >
                  {STARTING_FLOW_COPY.prepStopNo}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={styles.prepTopRow}>
                <span style={styles.prepLabel}>{STARTING_FLOW_COPY.prepTimerLabel}</span>
                <button
                  type="button"
                  onClick={() => setPrepStopConfirmOpen(true)}
                  style={styles.prepCloseBtn}
                  aria-label="Stop prep"
                >
                  ✕
                </button>
              </div>
              <p style={styles.prepCountdown}>{formatCountdown(openCountdownLeft)}</p>
              <button type="button" onClick={finishPrepTimer} style={styles.prepDoneBtn}>
                {STARTING_FLOW_COPY.donePrepping}
              </button>
            </>
          )}
        </div>
      ) : null}

      {workCompleteOpen ? (
        <div style={styles.backdrop}>
          <div style={styles.panel} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 style={styles.panelTitle}>{STARTING_FLOW_COPY.completeTitle}</h3>
            <p style={styles.panelBody}>{STARTING_FLOW_COPY.completeBody}</p>

            {!showDurationPicker ? (
              <div style={styles.panelActionsCentered}>
                <button type="button" onClick={endWorkSession} style={styles.panelSecondaryBtn}>
                  {STARTING_FLOW_COPY.completeNo}
                </button>
                <button type="button" onClick={() => setShowDurationPicker(true)} style={styles.panelPrimaryBtn}>
                  {STARTING_FLOW_COPY.completeYes}
                </button>
              </div>
            ) : (
              <div style={styles.pickerSection}>
                <div style={styles.presetRow}>
                  {KICKSTART_DURATION_PRESETS.map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setExtendMinutes(min)}
                      style={{
                        ...styles.presetBtn,
                        ...(extendMinutes === min ? styles.presetBtnActive : {}),
                      }}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
                <div style={styles.lockSection}>
                  <div style={styles.lockLabel}>Lock mode</div>
                  <div style={styles.lockRow}>
                    {(['none', 'soft', 'hard'] as FocusLockMode[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setExtendLockMode(mode)}
                        style={{
                          ...styles.lockBtn,
                          ...(extendLockMode === mode ? styles.lockBtnActive : {}),
                        }}
                      >
                        {mode === 'none' ? 'No lock' : mode === 'soft' ? 'Soft' : 'Hard'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={styles.panelActions}>
                  <button type="button" onClick={() => setShowDurationPicker(false)} style={styles.panelSecondaryBtn}>
                    {STARTING_FLOW_COPY.close}
                  </button>
                  <button
                    type="button"
                    onClick={() => extendWorkSession(extendMinutes, extendLockMode)}
                    style={styles.panelPrimaryBtn}
                  >
                    {STARTING_FLOW_COPY.keepGoing}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {workLoggedOpen ? (
        <div
          style={styles.backdrop}
          onClick={e => e.target === e.currentTarget && dismissWorkLogged()}
          role="presentation"
        >
          <div style={styles.panel} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 style={styles.panelTitle}>Session logged</h3>
            <p style={styles.panelBody}>{STARTING_FLOW_COPY.logged}</p>
            <div style={styles.panelActions}>
              <button type="button" onClick={dismissWorkLogged} style={styles.panelPrimaryBtn}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  prepFloat: {
    position: 'fixed',
    right: 20,
    bottom: 20,
    width: 220,
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: '14px 14px 12px',
    boxShadow: '0 12px 40px rgba(15, 23, 42, 0.22)',
    zIndex: 100002,
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  prepTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  prepLabel: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'lowercase',
    letterSpacing: '0.04em',
  },
  prepCloseBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 2,
    lineHeight: 1,
  },
  prepCountdown: {
    margin: 0,
    fontSize: 36,
    fontWeight: 900,
    color: '#0f172a',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center',
  },
  prepDoneBtn: {
    border: 'none',
    borderRadius: 10,
    padding: '11px 12px',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
  prepConfirm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  prepConfirmText: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    lineHeight: 1.45,
    textAlign: 'center',
  },
  prepConfirmActions: {
    display: 'flex',
    gap: 8,
  },
  prepConfirmYes: {
    flex: 1,
    border: 'none',
    borderRadius: 10,
    padding: '10px 8px',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
  prepConfirmNo: {
    flex: 1,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 8px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100001,
    fontFamily: font,
    boxSizing: 'border-box',
  },
  panel: {
    width: 'min(100%, 420px)',
    background: '#fff',
    borderRadius: 12,
    padding: '20px 22px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
  },
  panelTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  panelBody: {
    margin: '10px 0 0',
    fontSize: 14,
    color: '#64748b',
    lineHeight: 1.45,
  },
  panelActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  panelActionsCentered: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  panelPrimaryBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
  panelSecondaryBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  pickerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  presetRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  presetBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 999,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  presetBtnActive: {
    background: '#007aff',
    color: '#fff',
    borderColor: '#007aff',
  },
  lockSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  lockLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'center',
  },
  lockRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
  },
  lockBtn: {
    flex: 1,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 6px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  lockBtnActive: {
    background: '#0f172a',
    color: '#fff',
    borderColor: '#0f172a',
  },
};
