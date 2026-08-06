'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import { DEMO_CHECKOUT_SESSION_ID } from '@/lib/billing/demo';

const CREATE_ACCOUNT_HREF = '/login?mode=signup&next=/intro/chrome';

export default function SubscribeSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id')?.trim() || '';
  const isDemo = sessionId === DEMO_CHECKOUT_SESSION_ID;
  const [armed, setArmed] = useState(false);

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
        /* non-blocking */
      });
  }, [isDemo, sessionId, armed]);

  return (
    <MarketingShell showSignIn={false}>
      <div className="flex justify-center pt-12">
        <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {isDemo ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
              Demo mode — no real charges
            </p>
          ) : null}

          <div className="text-center">
            <p className="mb-2 text-lg font-bold text-slate-900">Payment received</p>
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
        </div>
      </div>
    </MarketingShell>
  );
}
