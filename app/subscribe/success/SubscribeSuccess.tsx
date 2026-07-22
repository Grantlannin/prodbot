'use client';

import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';

export default function SubscribeSuccess() {
  return (
    <MarketingShell showSignIn={false}>
      <div className="flex justify-center pt-12">
        <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="mb-2 text-lg font-bold text-slate-900">Payment received</p>
            <p className="text-sm leading-relaxed text-slate-600">
              Create your account with the same email you used at checkout. You&apos;ll need Google Chrome on desktop.
            </p>
          </div>
          <Link
            href="/login?mode=signup&next=/intro/chrome"
            className="rounded-xl bg-slate-900 px-4 py-3.5 text-center text-sm font-bold text-white no-underline transition hover:bg-slate-800"
          >
            Create account
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
