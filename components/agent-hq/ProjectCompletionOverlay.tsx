'use client';

import { useEffect, useCallback, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import CelebrationSettingsEditor from './CelebrationSettingsEditor';
import { stopCelebrationConfetti } from './celebrationEffects';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface ProjectCompletionOverlayProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

export default function ProjectCompletionOverlay({
  open,
  onClose,
  message,
}: ProjectCompletionOverlayProps) {
  const [editOpen, setEditOpen] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setEditOpen(false);
      return;
    }
    // Auto-dismiss only — confetti is fired once by triggerCelebration.
    const t = setTimeout(() => onCloseRef.current(), 8000);
    return () => clearTimeout(t);
  }, [open]);

  const handleClose = useCallback(() => {
    stopCelebrationConfetti();
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose]
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div style={styles.backdrop} onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div style={styles.card}>
        <p style={styles.message}>{message}</p>
        <button type="button" onClick={handleClose} style={styles.dismissBtn}>
          LET&apos;S GO
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setEditOpen(v => !v);
          }}
          style={styles.editMessageLink}
        >
          edit message
        </button>
        {editOpen && (
          <div style={styles.editPopover} onClick={e => e.stopPropagation()}>
            <CelebrationSettingsEditor compact onClose={() => setEditOpen(false)} />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'rgba(15, 23, 42, 0.72)',
    backdropFilter: 'blur(6px)',
  },
  card: {
    position: 'relative',
    maxWidth: 720,
    width: '100%',
    textAlign: 'center',
    padding: '40px 32px 36px',
    borderRadius: 16,
    background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 100%)',
    border: '2px solid rgba(96, 165, 250, 0.5)',
    boxShadow: '0 0 60px rgba(59, 130, 246, 0.55), 0 24px 48px rgba(0,0,0,0.4)',
  },
  message: {
    margin: 0,
    fontFamily: font,
    fontSize: 'clamp(22px, 4vw, 36px)',
    fontWeight: 900,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
    color: '#fff',
    textTransform: 'uppercase',
    textShadow: '0 0 24px rgba(96, 165, 250, 0.8)',
  },
  dismissBtn: {
    marginTop: 28,
    padding: '12px 28px',
    border: 'none',
    borderRadius: 10,
    background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
    color: '#fff',
    fontFamily: font,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)',
  },
  editMessageLink: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    border: 'none',
    background: 'transparent',
    color: 'rgba(148, 163, 184, 0.75)',
    fontFamily: font,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    padding: '4px 6px',
    textTransform: 'lowercase',
  },
  editPopover: {
    position: 'absolute',
    right: 12,
    bottom: 36,
    zIndex: 2,
    textAlign: 'left',
  },
};
