'use client';

import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import { getFullBotTutorialLoomUrl, getVideoEmbedUrl } from '@/lib/intro';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface TutorialVideoModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
}

export default function TutorialVideoModal({
  open,
  onClose,
  title = 'Full bot tutorial',
  footer,
}: TutorialVideoModalProps) {
  if (!open || typeof document === 'undefined') return null;

  const videoUrl = getFullBotTutorialLoomUrl();
  const embedUrl = getVideoEmbedUrl(videoUrl ?? undefined);

  return createPortal(
    <div style={styles.backdrop} onClick={onClose} role="presentation">
      <div
        style={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-video-title"
      >
        <div style={styles.topBar}>
          <h3 id="tutorial-video-title" style={styles.modalTitle}>
            {title}
          </h3>
          <button type="button" onClick={onClose} style={styles.headerClose} aria-label="Close">
            ✕
          </button>
        </div>

        {embedUrl ? (
          <div style={styles.videoFrame}>
            <iframe
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={styles.iframe}
            />
          </div>
        ) : (
          <p style={styles.placeholder}>
            Add <code style={styles.code}>NEXT_PUBLIC_LOOM_FULL_BOT_TUTORIAL_URL</code> in Vercel, then
            redeploy.
          </p>
        )}

        {footer ? <div style={styles.modalActions}>{footer}</div> : null}
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
    background: 'rgba(0, 0, 0, 0.82)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    boxSizing: 'border-box',
  },
  modal: {
    width: 'min(100%, 1100px)',
    maxHeight: '96vh',
    background: '#000',
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.55)',
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    background: '#0a0a0a',
    flexShrink: 0,
  },
  modalTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  headerClose: {
    border: 'none',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '6px 9px',
    borderRadius: 8,
  },
  videoFrame: {
    position: 'relative',
    width: '100%',
    // Prefer filling the viewport over a fixed small card
    height: 'min(78vh, calc(100vw * 9 / 16))',
    minHeight: 280,
    background: '#000',
    flexShrink: 0,
  },
  iframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    background: '#000',
  },
  placeholder: {
    margin: 0,
    padding: '28px 18px',
    fontSize: 13,
    lineHeight: 1.5,
    color: '#94a3b8',
  },
  code: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
    padding: '10px 12px 12px',
    background: '#0a0a0a',
    flexShrink: 0,
  },
};
