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
        <h3 id="tutorial-video-title" style={styles.modalTitle}>
          {title}
        </h3>
        {embedUrl ? (
          <div style={styles.videoFrame}>
            <iframe
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
        <div style={styles.modalActions}>
          {footer ?? (
            <button type="button" onClick={onClose} style={styles.closeBtn}>
              Close
            </button>
          )}
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
    background: 'rgba(15, 23, 42, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  modal: {
    width: 'min(100%, 640px)',
    background: '#fff',
    borderRadius: 12,
    padding: '18px 18px 16px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.2)',
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  modalTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
  },
  videoFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#0f172a',
  },
  iframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  placeholder: {
    margin: 0,
    padding: '20px 14px',
    borderRadius: 10,
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    fontSize: 13,
    lineHeight: 1.5,
    color: '#64748b',
  },
  code: {
    fontSize: 12,
    color: '#475569',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  closeBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
};
