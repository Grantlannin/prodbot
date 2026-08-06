'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import { COURSE_PRICE_LABEL } from '@/lib/billing/price';
import { DEMO_CHECKOUT_SESSION_ID } from '@/lib/billing/demo';

const CREATE_ACCOUNT_HREF = '/login?mode=signup&next=/intro/chrome';

export default function SubscribeSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id')?.trim() || '';
  const courseDone = searchParams.get('course') === '1';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bought, setBought] = useState(courseDone);
  const [armed, setArmed] = useState(false);

  const showOto = useMemo(() => Boolean(sessionId) && !bought, [sessionId, bought]);
  const isDemo = sessionId === DEMO_CHECKOUT_SESSION_ID;

  useEffect(() => {
    if (!isDemo || armed) return;
    void fetch('/api/billing/demo/arm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(async res => {
        if (res.ok) setArmed(true);
      })
      .catch(() => {
        /* non-blocking — signup still works with paywall off */
      });
  }, [isDemo, sessionId, armed]);

  const buyCourse = async () => {
    if (!sessionId) {
      setError('Missing checkout session. You can skip and create your account.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/oto-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        alreadyPaid?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not add the course.');
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBought(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the course.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MarketingShell showSignIn={false}>
      <div className="flex justify-center pt-12">
        <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {isDemo ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
              Demo mode — no real charges
            </p>
          ) : null}

          {showOto ? (
            <>
              <div className="text-center">
                <p className="mb-2 text-lg font-bold text-slate-900">One more thing</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Add the Daywinner Course for {COURSE_PRICE_LABEL} — one-time
                  {isDemo ? ' (simulated)' : ', charged to the card you just used'}.
                </p>
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <button
                type="button"
                onClick={buyCourse}
                disabled={busy}
                className="rounded-xl bg-slate-900 px-4 py-3.5 text-center text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {busy ? 'Processing…' : `Yes — add the course for ${COURSE_PRICE_LABEL}`}
              </button>

              <Link
                href={CREATE_ACCOUNT_HREF}
                className="text-center text-sm font-semibold text-slate-500 no-underline transition hover:text-slate-800"
              >
                No thanks — continue to account setup
              </Link>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="mb-2 text-lg font-bold text-slate-900">
                  {bought ? 'Course added' : 'Payment received'}
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Create your account with the same email you used at checkout. You&apos;ll need Google Chrome on
                  desktop.
                </p>
              </div>
              <Link
                href={CREATE_ACCOUNT_HREF}
                className="rounded-xl bg-slate-900 px-4 py-3.5 text-center text-sm font-bold text-white no-underline transition hover:bg-slate-800"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </MarketingShell>
  );
}
