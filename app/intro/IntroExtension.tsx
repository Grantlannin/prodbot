'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import MarketingShell from '@/components/marketing/MarketingShell';
import { pingFocusExtension } from '@/components/agent-hq/focusBlocking';
import {
  getChromeExtensionStoreUrl,
  INTRO_VIDEO_PATH,
  markExtensionIntroCompleteClient,
  ONBOARDING_STEP_COUNT,
} from '@/lib/intro';
import { PRODUCTION_SITE_HOST } from '@/lib/site';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function IntroExtension() {
  const router = useRouter();
  const [detected, setDetected] = useState(false);
  const storeUrl = getChromeExtensionStoreUrl();

  useEffect(() => pingFocusExtension(() => setDetected(true)), []);

  const handleContinue = () => {
    markExtensionIntroCompleteClient();
    router.push(INTRO_VIDEO_PATH);
    router.refresh();
  };

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.step}>Step 2 of {ONBOARDING_STEP_COUNT}</p>
          <h1 style={styles.title}>Install the focus extension</h1>
          <p style={styles.lead}>
            Blocks distracting sites during focus sessions. Keep a <strong>{PRODUCTION_SITE_HOST}</strong> tab open
            while you work so blocking stays in sync.
          </p>

          {detected ? (
            <p style={styles.detected}>Extension connected — you&apos;re good to go.</p>
          ) : (
            <p style={styles.pending}>Install the extension on this browser, then we&apos;ll detect it automatically.</p>
          )}

          {storeUrl ? (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" style={styles.primaryLink}>
              Add to Chrome — Web Store
            </a>
          ) : (
            <p style={styles.note}>
              Set <code style={styles.code}>NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL</code> in Vercel to your store listing
              link.
            </p>
          )}

          <a href="/daywinner.zip" download="daywinner.zip" style={styles.secondaryLink}>
            Or download extension zip (v1.0.6)
          </a>

          <ol style={styles.steps}>
            {storeUrl ? (
              <li>Click <strong>Add to Chrome</strong> above and confirm install.</li>
            ) : (
              <li>
                Unzip the download → <code style={styles.code}>chrome://extensions</code> → Developer mode → Load
                unpacked.
              </li>
            )}
            <li>Reload the extension if you had an older copy installed.</li>
            <li>Come back here — we&apos;ll show &quot;Extension connected&quot; when it&apos;s working.</li>
          </ol>

          <button type="button" onClick={handleContinue} style={styles.btn}>
            {detected ? 'Continue to intro video' : 'Skip for now'}
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
  note: {
    margin: 0,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  code: {
    fontSize: 11,
    color: '#475569',
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
  secondaryLink: {
    display: 'block',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    textDecoration: 'none',
  },
  steps: {
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
