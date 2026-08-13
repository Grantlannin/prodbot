'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import MarketingShell from '@/components/marketing/MarketingShell';
import { pingFocusExtension } from '@/components/agent-hq/focusBlocking';
import {
  getChromeExtensionStoreUrl,
  markExtensionIntroCompleteClient,
  markIntroCompleteClient,
  ONBOARDING_STEP_COUNT,
} from '@/lib/intro';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function IntroExtension() {
  const router = useRouter();
  const [detected, setDetected] = useState(false);
  const storeUrl = getChromeExtensionStoreUrl();

  useEffect(() => pingFocusExtension(() => setDetected(true)), []);

  const handleContinue = () => {
    markExtensionIntroCompleteClient();
    markIntroCompleteClient();
    router.push('/app');
    router.refresh();
  };

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.step}>Step 2 of {ONBOARDING_STEP_COUNT}</p>
          <h1 style={styles.title}>Install the focus extension</h1>
          <p style={styles.lead}>
            The focus extension blocks distracting sites during your work sessions &amp; communicates vital information
            with your dashboard.
          </p>

          {detected ? (
            <p style={styles.detected}>Extension connected — you&apos;re good to go.</p>
          ) : (
            <p style={styles.pending}>
              After installing, come back here and refresh this page — we&apos;ll show &quot;Extension
              connected&quot; when it&apos;s working.
            </p>
          )}

          {storeUrl ? (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" style={styles.primaryLink}>
              Add to Chrome — Web Store
            </a>
          ) : (
            <>
              <p style={styles.note}>
                Chrome Web Store link is not configured yet. Ask support or use the developer zip below.
              </p>
              <a href="/daywinner.zip" download="daywinner.zip" style={styles.secondaryLink}>
                Download extension zip
              </a>
            </>
          )}

          <p style={styles.note}>
            Note: When you download the extension, Chrome will pop up a message that says the extension can
            &quot;read and change all your data on all websites&quot;. A sketchy sounding phrase that made me go
            &quot;wtf?&quot; when i saw it as someone who doesn&apos;t want to give any data to anyone. I am still
            to this day unsure why Chrome used that specific ambiguous wording. In normal language: what this
            sentence means is that you&apos;re giving the extension permission to block specific pages of your
            choosing (like any normal blocker), and because you can block any site you want, Chrome calls this
            &quot;can change data on all sites&quot;. When you hit a blocked site, Daywinner logs that as an
            &quot;infraction&quot; and keeps score for you on your dashboard. The extension does not care about any
            history — it just blocks the sites you choose &amp; counts up the infractions (if there are any) in
            your dashboard.
          </p>

          <ol style={styles.steps}>
            {storeUrl ? (
              <>
                <li>
                  Click <strong>Add to Chrome</strong> above and confirm install.
                </li>
                <li>Reload the extension if you had an older copy installed.</li>
                <li>
                  Come back here and refresh this page — we&apos;ll show &quot;Extension connected&quot; when
                  it&apos;s working.
                </li>
              </>
            ) : (
              <>
                <li>
                  Unzip the download → <code style={styles.code}>chrome://extensions</code> → Developer mode → Load
                  unpacked.
                </li>
                <li>
                  Come back here and refresh this page — we&apos;ll show &quot;Extension connected&quot; when
                  it&apos;s working.
                </li>
              </>
            )}
          </ol>

          {detected ? (
            <button type="button" onClick={handleContinue} style={styles.btn}>
              Continue
            </button>
          ) : (
            <button type="button" onClick={handleContinue} style={styles.skipBtn}>
              Skip
            </button>
          )}
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
  skipBtn: {
    alignSelf: 'center',
    marginTop: 8,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: '4px 8px',
  },
};
