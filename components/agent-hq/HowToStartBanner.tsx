'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  getHowToStartLoomUrl,
  getLoomEmbedUrl,
  isHowToStartDismissedClient,
  markHowToStartDismissedClient,
} from '@/lib/intro';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function HowToStartBanner() {
  const [visible, setVisible] = useState(false);
  const embedUrl = getLoomEmbedUrl(getHowToStartLoomUrl() ?? undefined);

  useEffect(() => {
    setVisible(!isHowToStartDismissedClient());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    markHowToStartDismissedClient();
    setVisible(false);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <p style={styles.eyebrow}>First time here</p>
            <h2 style={styles.title}>How to start</h2>
            <p style={styles.lead}>
              Watch this once — then you&apos;re set. It won&apos;t show again after you dismiss it.
            </p>
          </div>
          <button type="button" onClick={dismiss} style={styles.dismissX} aria-label="Dismiss how to start">
            ×
          </button>
        </div>

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
            Add your Loom URL as <code style={styles.code}>NEXT_PUBLIC_LOOM_HOW_TO_START_URL</code> in Vercel,
            then redeploy.
          </p>
        )}

        <button type="button" onClick={dismiss} style={styles.btn}>
          Got it — hide this
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: '14px 16px 0',
    fontFamily: font,
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '16px 16px 14px',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  title: {
    margin: '4px 0 0',
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  lead: {
    margin: '6px 0 0',
    fontSize: 13,
    lineHeight: 1.45,
    color: '#64748b',
    maxWidth: 520,
  },
  dismissX: {
    flexShrink: 0,
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: font,
  },
  videoFrame: {
    position: 'relative',
    width: '100%',
    maxWidth: 640,
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
  btn: {
    alignSelf: 'flex-start',
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
};
