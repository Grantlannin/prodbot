'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { formatDuration } from './chatLogic';
import { SOFT_LOCK_COOLDOWN_MS } from './focusBlocking';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface EndWorkSessionConfirmModalProps {
  open: boolean;
  onClose: () => void;
}

type SoftPhase = 'initial' | 'cooldown' | 'confirm';

function formatCooldown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function EndWorkSessionConfirmModal({ open, onClose }: EndWorkSessionConfirmModalProps) {
  const { currentSession, elapsed, finishWorkSession, status, openCountdownLeft } = useWorkTrackerContext();

  const [softPhase, setSoftPhase] = useState<SoftPhase>('initial');
  const [cooldownLeft, setCooldownLeft] = useState(SOFT_LOCK_COOLDOWN_MS);
  const softLockProgressRef = useRef<{
    sessionId: string;
    phase: SoftPhase;
    cooldownEndAt?: number;
  } | null>(null);

  const lockMode = currentSession?.lockMode ?? 'none';
  const hasActiveSession = status === 'working' || status === 'on_break';
  const taskLabel = currentSession?.project?.trim() || 'this session';
  const isHardLock = lockMode === 'hard';
  const isSoftLock = lockMode === 'soft';

  useEffect(() => {
    if (!open) return;

    const sessionId = currentSession?.id;
    const saved =
      sessionId && softLockProgressRef.current?.sessionId === sessionId
        ? softLockProgressRef.current
        : null;

    if (saved?.phase === 'confirm') {
      setSoftPhase('confirm');
      setCooldownLeft(0);
    } else if (saved?.phase === 'cooldown' && saved.cooldownEndAt) {
      const remaining = saved.cooldownEndAt - Date.now();
      if (remaining <= 0) {
        setSoftPhase('confirm');
        setCooldownLeft(0);
      } else {
        setSoftPhase('cooldown');
        setCooldownLeft(remaining);
      }
    } else {
      setSoftPhase('initial');
      setCooldownLeft(SOFT_LOCK_COOLDOWN_MS);
      softLockProgressRef.current = null;
    }
  }, [open, currentSession?.id]);

  useEffect(() => {
    if (!open || !isSoftLock || softPhase !== 'cooldown') return;
    const sessionId = currentSession?.id;
    if (!sessionId) return;

    const saved = softLockProgressRef.current;
    const endAt =
      saved?.sessionId === sessionId && saved.phase === 'cooldown' && saved.cooldownEndAt
        ? saved.cooldownEndAt
        : Date.now() + SOFT_LOCK_COOLDOWN_MS;

    softLockProgressRef.current = { sessionId, phase: 'cooldown', cooldownEndAt: endAt };

    const tick = () => {
      const remaining = endAt - Date.now();
      if (remaining <= 0) {
        setCooldownLeft(0);
        softLockProgressRef.current = { sessionId, phase: 'confirm' };
        setSoftPhase('confirm');
        return;
      }
      setCooldownLeft(remaining);
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [open, isSoftLock, softPhase, currentSession?.id]);

  const handleConfirm = () => {
    if (!hasActiveSession || isHardLock) return;
    softLockProgressRef.current = null;
    finishWorkSession();
    onClose();
  };

  const handleDismiss = () => {
    softLockProgressRef.current = null;
    onClose();
  };

  const handleBackdropClick = () => {
    if (isSoftLock || isHardLock) return;
    handleDismiss();
  };

  const handleSoftEndClick = () => {
    if (softPhase === 'initial') {
      const sessionId = currentSession?.id;
      if (sessionId) {
        softLockProgressRef.current = {
          sessionId,
          phase: 'cooldown',
          cooldownEndAt: Date.now() + SOFT_LOCK_COOLDOWN_MS,
        };
      }
      setSoftPhase('cooldown');
      return;
    }
    if (softPhase === 'confirm') {
      handleConfirm();
    }
  };

  useEffect(() => {
    if (open && !hasActiveSession) {
      onClose();
    }
  }, [open, hasActiveSession, onClose]);

  const hardLockHint =
    openCountdownLeft != null
      ? `You cannot end this session early. It ends when the countdown reaches zero (${formatCooldown(openCountdownLeft)} left).`
      : 'You cannot end this session early.';

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div style={styles.backdrop} onClick={handleBackdropClick} role="presentation">
      <div
        style={styles.panel}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-session-title"
      >
        <h3 id="end-session-title" style={styles.title}>
          {isHardLock ? 'Hard lock active' : 'End work session?'}
        </h3>
        <p style={styles.subtitle}>
          {taskLabel}
          {elapsed > 0 ? ` · ${formatDuration(elapsed)}` : ''}
        </p>

        {isHardLock ? (
          <p style={styles.hint}>{hardLockHint}</p>
        ) : isSoftLock ? (
          <p style={styles.hint}>
            {softPhase === 'initial'
              ? 'Soft lock: ending early starts a 2-minute wait before you can confirm.'
              : softPhase === 'cooldown'
                ? `Wait ${formatCooldown(cooldownLeft)} before confirming.`
                : 'Cooldown complete. Confirm to end your session.'}
          </p>
        ) : (
          <p style={styles.hint}>Your time will be saved to today&apos;s totals.</p>
        )}

        <div style={styles.actions}>
          <button type="button" onClick={handleDismiss} style={styles.secondaryBtn}>
            Keep working
          </button>
          {!isHardLock &&
            (!isSoftLock ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!hasActiveSession}
                style={{
                  ...styles.dangerBtn,
                  ...(!hasActiveSession ? styles.dangerBtnDisabled : {}),
                }}
              >
                End session
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSoftEndClick}
                disabled={!hasActiveSession || softPhase === 'cooldown'}
                style={{
                  ...styles.dangerBtn,
                  ...(!hasActiveSession || softPhase === 'cooldown' ? styles.dangerBtnDisabled : {}),
                }}
              >
                {softPhase === 'confirm' ? 'Confirm end session' : 'End session'}
              </button>
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
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
    background: '#fff',
    borderRadius: 12,
    padding: '20px 22px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.45,
  },
  hint: {
    margin: '10px 0 0',
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  secondaryBtn: {
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
  dangerBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#dc2626',
    color: '#fff',
    cursor: 'pointer',
  },
  dangerBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
};
