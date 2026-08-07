'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import { PRODUCTION_SITE_ORIGIN } from '@/lib/site';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  armSetupRequiredClient,
  CHROME_DOWNLOAD_URL,
  INTRO_CHROME_PATH,
  INTRO_CHROME_RESUME_PATH,
  INTRO_EXTENSION_PATH,
  isChromeBrowserClient,
  isMobileBrowserClient,
  markChromeIntroCompleteClient,
  ONBOARDING_STEP_COUNT,
} from '@/lib/intro';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function continueLinkUrl(): string {
  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')) ||
    (typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
      ? window.location.origin
      : '') ||
    PRODUCTION_SITE_ORIGIN;
  return `${origin}${INTRO_CHROME_RESUME_PATH}`;
}

function magicLinkRedirectTo(): string {
  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')) ||
    (typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
      ? window.location.origin
      : '') ||
    PRODUCTION_SITE_ORIGIN;
  const next = encodeURIComponent(INTRO_CHROME_RESUME_PATH);
  return `${origin}/auth/callback?next=${next}`;
}

export default function IntroChrome() {
  const router = useRouter();
  const onChrome = useMemo(() => isChromeBrowserClient(), []);
  const onMobile = useMemo(() => isMobileBrowserClient(), []);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('resume_setup') !== '1') return;
    armSetupRequiredClient();
    window.history.replaceState({}, '', INTRO_CHROME_PATH);
  }, []);

  const handleContinue = () => {
    markChromeIntroCompleteClient();
    router.push(INTRO_EXTENSION_PATH);
    router.refresh();
  };

  const handleCopyLink = async () => {
    setEmailError(null);
    try {
      await navigator.clipboard.writeText(continueLinkUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setEmailError('Could not copy. Long-press the link text below and copy it.');
    }
  };

  const handleEmailLink = async () => {
    setEmailBusy(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.trim();
      if (!email) {
        throw new Error('Sign in again, then request the continue link.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: magicLinkRedirectTo(),
        },
      });
      if (error) throw error;
      setEmailMessage(
        `Link sent to ${email}. Open that email on your computer (not this phone), then continue setup there.`
      );
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Could not send email.');
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <p style={styles.step}>Step 1 of {ONBOARDING_STEP_COUNT}</p>
          <h1 style={styles.title}>Hook up Google Chrome</h1>

          {onMobile ? (
            <>
              <p style={styles.mobileBanner}>
                Daywinner runs in <strong>Google Chrome on a computer</strong> (desktop or laptop) — not on phones.
                Finish setup on your computer next.
              </p>
              <p style={styles.lead}>
                You can keep this tab open. Email yourself a magic link (or copy the link), open it on your computer,
                and you&apos;ll land right back here signed in.
              </p>

              {emailMessage ? <p style={styles.detected}>{emailMessage}</p> : null}
              {emailError ? <p style={styles.error}>{emailError}</p> : null}

              <button type="button" onClick={() => void handleEmailLink()} disabled={emailBusy} style={styles.btn}>
                {emailBusy ? 'Sending…' : 'Email me a link to continue on my computer'}
              </button>
              <button type="button" onClick={() => void handleCopyLink()} style={styles.secondaryBtn}>
                {copied ? 'Copied!' : 'Copy continue link'}
              </button>
              <p style={styles.linkHint}>{continueLinkUrl()}</p>

              <p style={styles.supportNote}>
                On your computer: open the email/link in Chrome → you&apos;ll continue to the focus extension step.
              </p>

              <button type="button" onClick={handleContinue} style={styles.skipBtn}>
                I&apos;m already on a computer — continue
              </button>
            </>
          ) : (
            <>
              <p style={styles.lead}>
                Chrome is the browser we&apos;ve designed the bot around. So if you don&apos;t currently have it,
                let&apos;s download it quickly here if you&apos;re not already using it. If you do already use Chrome,
                just continue to set up the extension below. Note: if you&apos;re using a different browser, adding a
                new browser is a fantastic way to refresh everything for maximum productivity. (Also, there is no
                affiliation with Chrome — it is just what we personally use &amp; designed the bot around.)
              </p>
              <p style={styles.supportNote}>
                Daywinner and the focus extension run in Google Chrome on desktop. Safari, Firefox, and mobile browsers
                are not supported.
              </p>

              {onChrome ? (
                <p style={styles.detected}>You&apos;re on Chrome — you&apos;re ready for the next step.</p>
              ) : (
                <a href={CHROME_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" style={styles.primaryLink}>
                  Download Google Chrome
                </a>
              )}

              <ul style={styles.list}>
                <li>Install Chrome, then open this site again in Chrome.</li>
                <li>Sign in with the same account you used at checkout.</li>
                <li>Next you&apos;ll add the focus extension from the Chrome Web Store.</li>
              </ul>

              <button type="button" onClick={handleContinue} style={styles.btn}>
                {onChrome ? 'Continue to extension setup' : 'I have Chrome — continue'}
              </button>
            </>
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
    maxWidth: 560,
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
    lineHeight: 1.3,
  },
  lead: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: '#64748b',
  },
  supportNote: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#475569',
  },
  mobileBanner: {
    margin: 0,
    padding: '12px 14px',
    borderRadius: 10,
    background: '#fff7ed',
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 1.5,
  },
  detected: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#ecfdf5',
    color: '#047857',
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.45,
  },
  error: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 1.45,
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
  secondaryBtn: {
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
  },
  linkHint: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.4,
    color: '#94a3b8',
    wordBreak: 'break-all',
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
