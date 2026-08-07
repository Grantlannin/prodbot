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
        <div style={styles.header}>
          <h3 id="tutorial-video-title" style={styles.modalTitle}>
            {title}
          </h3>
          <button type="button" onClick={onClose} style={styles.headerClose} aria-label="Close">
            ✕
          </button>
        </div>
        {embedUrl ? (
          <div style={styles.videoShell}>
            <div style={styles.videoFrame}>
              <iframe
                src={embedUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={styles.iframe}
              />
            </div>
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
    background: 'rgba(2, 6, 23, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    boxSizing: 'border-box',
  },
  modal: {
    width: 'min(100%, 920px)',
    background: '#0b1220',
    borderRadius: 14,
    padding: '14px 14px 12px',
    boxShadow: '0 28px 64px rgba(0, 0, 0, 0.45)',
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    border: '1px solid rgba(148, 163, 184, 0.18)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '2px 4px 0',
  },
  modalTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#f8fafc',
  },
  headerClose: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 6,
  },
  videoShell: {
    background: '#000',
    borderRadius: 10,
    padding: 0,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  videoFrame: {
    position: 'relative',
    width: '100%',
    // Slightly taller than 16:9 so YouTube’s control bar isn’t clipped against white
    aspectRatio: '16 / 9.15',
    background: '#000',
    overflow: 'hidden',
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
    padding: '20px 14px',
    borderRadius: 10,
    background: '#111827',
    border: '1px dashed #334155',
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
  },
  closeBtn: {
    border: '1px solid rgba(148, 163, 184, 0.35)',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    background: '#1e293b',
    color: '#f8fafc',
    cursor: 'pointer',
  },
};
