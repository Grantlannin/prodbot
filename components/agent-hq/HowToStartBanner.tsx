'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  getHowToStartLoomUrl,
  getVideoEmbedUrl,
  isHowToStartDismissedClient,
  markHowToStartDismissedClient,
} from '@/lib/intro';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function HowToStartBanner() {
  const [visible, setVisible] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const videoUrl = getHowToStartLoomUrl();
  const embedUrl = getVideoEmbedUrl(videoUrl ?? undefined);

  useEffect(() => {
    const show = !isHowToStartDismissedClient();
    setVisible(show);
    if (show) setVideoOpen(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    markHowToStartDismissedClient();
    setVideoOpen(false);
    setVisible(false);
  };

  const openVideo = () => {
    if (embedUrl) {
      setVideoOpen(true);
      return;
    }
    if (videoUrl) {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setVideoOpen(true);
  };

  const modal =
    videoOpen && typeof document !== 'undefined'
      ? createPortal(
          <div style={styles.backdrop} onClick={() => setVideoOpen(false)} role="presentation">
            <div
              style={styles.modal}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="how-to-start-title"
            >
              <h3 id="how-to-start-title" style={styles.modalTitle}>
                How to start
              </h3>
              {embedUrl ? (
                <div style={styles.videoFrame}>
                  <iframe
                    src={embedUrl}
                    title="How to start with Daywinner"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={styles.iframe}
                  />
                </div>
              ) : (
                <p style={styles.placeholder}>
                  Add <code style={styles.code}>NEXT_PUBLIC_LOOM_FULL_BOT_TUTORIAL_URL</code> in Vercel,
                  then redeploy.
                </p>
              )}
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setVideoOpen(false)} style={styles.secondaryBtn}>
                  Close
                </button>
                <button type="button" onClick={dismiss} style={styles.primaryBtn}>
                  Got it — don&apos;t show again
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <style>{`
        @keyframes howToStartArrowPulse {
          0%, 100% { transform: translateY(0); opacity: 0.75; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
      <div style={styles.wrap}>
        <button type="button" onClick={openVideo} style={styles.ctaBtn}>
          ▶ How to start
        </button>
        <div style={styles.arrows} aria-hidden>
          <span style={styles.arrow}>↑</span>
          <span style={{ ...styles.arrow, ...styles.arrowMid }}>↑</span>
          <span style={styles.arrow}>↑</span>
        </div>
        <button type="button" onClick={dismiss} style={styles.skipBtn}>
          Dismiss
        </button>
      </div>
      {modal}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '10px 16px 4px',
    fontFamily: font,
  },
  ctaBtn: {
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    background: '#fff',
    color: '#b91c1c',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(185, 28, 28, 0.08)',
  },
  arrows: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 10,
    lineHeight: 1,
    marginTop: 2,
  },
  arrow: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 700,
    display: 'inline-block',
    animation: 'howToStartArrowPulse 1.1s ease-in-out infinite',
  },
  arrowMid: {
    animationDelay: '0.15s',
    fontSize: 22,
  },
  skipBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: '2px 6px',
  },
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
  secondaryBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  primaryBtn: {
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
