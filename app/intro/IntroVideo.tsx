'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import MarketingShell from '@/components/marketing/MarketingShell';
import { getLoomEmbedUrl, markIntroCompleteClient } from '@/lib/intro';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface IntroVideoProps {
  loomUrl: string | null;
}

export default function IntroVideo({ loomUrl }: IntroVideoProps) {
  const router = useRouter();
  const embedUrl = getLoomEmbedUrl(loomUrl ?? undefined);

  const handleContinue = () => {
    markIntroCompleteClient();
    router.push('/app');
    router.refresh();
  };

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.step}>Step 2 of 2</p>
          <h1 style={styles.title}>Quick intro</h1>
          <p style={styles.lead}>A 2-minute walkthrough of how Daywinner works.</p>

          {embedUrl ? (
            <div style={styles.videoFrame}>
              <iframe
                src={embedUrl}
                title="Daywinner intro"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={styles.iframe}
              />
            </div>
          ) : (
            <p style={styles.placeholder}>
              Intro video coming soon — add <code style={styles.code}>NEXT_PUBLIC_LOOM_INTRO_URL</code> in Vercel,
              then redeploy.
            </p>
          )}

          <button type="button" onClick={handleContinue} style={styles.btn}>
            Got it — open app
          </button>
        </div>
      </div>
    </MarketingShell>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 48,
    fontFamily: font,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: '28px 24px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  step: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
  },
  lead: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: '#64748b',
  },
  videoFrame: {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%',
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
    padding: '24px 16px',
    borderRadius: 10,
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    fontSize: 13,
    lineHeight: 1.5,
    color: '#64748b',
    textAlign: 'center',
  },
  code: {
    fontSize: 12,
    color: '#475569',
  },
  btn: {
    border: 'none',
    borderRadius: 10,
    padding: '13px 14px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
};
