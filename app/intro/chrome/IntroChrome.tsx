'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import MarketingShell from '@/components/marketing/MarketingShell';
import {
  CHROME_DOWNLOAD_URL,
  INTRO_EXTENSION_PATH,
  markChromeIntroCompleteClient,
  ONBOARDING_STEP_COUNT,
  isChromeBrowserClient,
} from '@/lib/intro';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function IntroChrome() {
  const router = useRouter();
  const onChrome = useMemo(() => isChromeBrowserClient(), []);

  const handleContinue = () => {
    markChromeIntroCompleteClient();
    router.push(INTRO_EXTENSION_PATH);
    router.refresh();
  };

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.step}>Step 1 of {ONBOARDING_STEP_COUNT}</p>
          <h1 style={styles.title}>Use Google Chrome</h1>
          <p style={styles.lead}>
            Daywinner and the focus extension run in <strong>Google Chrome</strong> on desktop. Safari, Firefox, and
            mobile browsers are not supported yet.
          </p>

          {onChrome ? (
            <p style={styles.detected}>You&apos;re on Chrome — you&apos;re ready for the next step.</p>
          ) : (
            <p style={styles.pending}>
              If you&apos;re on another browser, download Chrome first. Take your time — we&apos;ll wait here.
            </p>
          )}

          <a href={CHROME_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" style={styles.primaryLink}>
            Download Google Chrome
          </a>

          <ul style={styles.list}>
            <li>Install Chrome, then open this site again in Chrome.</li>
            <li>Sign in with the same account you used at checkout.</li>
            <li>Next you&apos;ll add the focus extension from the Chrome Web Store.</li>
          </ul>

          <button type="button" onClick={handleContinue} style={styles.btn}>
            {onChrome ? 'Continue to extension setup' : 'I have Chrome — continue'}
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
    maxWidth: 520,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: '28px 24px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
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
  detected: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#ecfdf5',
    color: '#047857',
    fontSize: 13,
    fontWeight: 600,
  },
  pending: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 13,
  },
  primaryLink: {
    display: 'block',
    textAlign: 'center',
    borderRadius: 10,
    padding: '13px 14px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    textDecoration: 'none',
  },
  list: {
    margin: '4px 0 0',
    paddingLeft: 18,
    color: '#475569',
    fontSize: 13,
    lineHeight: 1.55,
  },
  btn: {
    marginTop: 4,
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
