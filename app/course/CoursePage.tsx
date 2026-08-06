'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import { COURSE_PRICE_LABEL } from '@/lib/billing/price';
import { COURSE_MODULES, COURSE_TAGLINE, COURSE_TITLE } from '@/lib/course/modules';
import { isBillingDemoFlow } from '@/lib/stripe/config';

interface BillingStatus {
  billingEnabled: boolean;
  active: boolean;
  courseAccess: boolean;
  checks?: { demoFlow?: boolean };
}

export default function CoursePage() {
  const searchParams = useSearchParams();
  const purchased = searchParams.get('purchased') === '1';

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    void fetch('/api/billing/status')
      .then(async res => {
        const data = (await res.json()) as BillingStatus & { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Could not load access.');
        setStatus(data);
      })
      .catch(() => setError('Could not load course access.'));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (purchased) reload();
  }, [purchased, reload]);

  const buyCourse = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/oto-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        courseAccess?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Could not start course purchase.');
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start course purchase.');
    } finally {
      setBusy(false);
    }
  };

  const demoHint =
    status?.checks?.demoFlow === true ||
    (typeof window !== 'undefined' && isBillingDemoFlow());

  if (!status) {
    return (
      <MarketingShell showSignIn={false}>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-500">Loading…</div>
      </MarketingShell>
    );
  }

  if (!status.courseAccess) {
    return (
      <MarketingShell showSignIn={false}>
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Course locked
            </p>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{COURSE_TITLE}</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">{COURSE_TAGLINE}</p>

            {demoHint ? (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Demo mode — unlock is free (no charge)
              </p>
            ) : null}

            {error ? (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={buyCourse}
              disabled={busy}
              className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy
                ? 'Working…'
                : demoHint
                  ? 'Unlock course (demo) →'
                  : `Unlock course — ${COURSE_PRICE_LABEL}`}
            </button>

            <Link
              href="/app"
              className="mt-4 block text-center text-sm font-semibold text-slate-500 no-underline hover:text-slate-800"
            >
              ← Back to bot
            </Link>
          </div>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell showSignIn={false}>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Your course
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{COURSE_TITLE}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{COURSE_TAGLINE}</p>
          </div>
          <Link
            href="/app"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline shadow-sm hover:bg-slate-50"
          >
            ← Back to bot
          </Link>
        </div>

        {purchased ? (
          <p className="mb-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            Course unlocked — same login as your bot.
          </p>
        ) : null}

        <ol className="flex flex-col gap-4">
          {COURSE_MODULES.map((mod, index) => (
            <li
              key={mod.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Module {index + 1}
              </p>
              <h2 className="mb-1 text-lg font-bold text-slate-900">{mod.title}</h2>
              <p className="mb-3 text-sm leading-relaxed text-slate-600">{mod.summary}</p>

              {mod.videoUrl ? (
                <a
                  href={mod.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-sm font-bold text-slate-900 underline-offset-2 hover:underline"
                >
                  Watch module →
                </a>
              ) : (
                <p className="text-xs italic text-slate-400">
                  Video link placeholder — paste your Loom/Vimeo URL in{' '}
                  <code className="rounded bg-slate-100 px-1">lib/course/modules.ts</code>
                </p>
              )}

              {mod.resources && mod.resources.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1">
                  {mod.resources.map(resource => (
                    <li key={resource.href}>
                      <a
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
                      >
                        {resource.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </MarketingShell>
  );
}
