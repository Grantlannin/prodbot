'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  isHowToStartDismissedClient,
  markHowToStartDismissedClient,
} from '@/lib/intro';
import TutorialVideoModal from './TutorialVideoModal';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function HowToStartBanner() {
  const [visible, setVisible] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

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

  return (
    <>
      <style>{`
        @keyframes howToStartArrowPulse {
          0%, 100% { transform: translateY(0); opacity: 0.75; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
      <div style={styles.wrap}>
        <button type="button" onClick={() => setVideoOpen(true)} style={styles.ctaBtn}>
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
      <TutorialVideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        title="How to start"
        footer={
          <>
            <button type="button" onClick={() => setVideoOpen(false)} style={styles.secondaryBtn}>
              Close
            </button>
            <button type="button" onClick={dismiss} style={styles.primaryBtn}>
              Got it — don&apos;t show again
            </button>
          </>
        }
      />
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
