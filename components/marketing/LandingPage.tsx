import Link from 'next/link';
import { isBillingEnabled } from '@/lib/stripe/config';
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_SHORT } from '@/lib/billing/price';
import MarketingShell from './MarketingShell';

const features = [
  "Work timer with soft & hard session locks (so you can't distract yourself)",
  'A homebase for your most important projects, tasks, notes, and context links in 1 easy-to-use, central location',
  'End-of-day reports of what you worked on / how long you worked (for yourself to be proud of) or that you can send to an accountability partner via email in 1 easy click',
  'Chrome extension for site blocking + infraction tracker to track exactly how many times you distracted yourself in a work session (and for the day)',
];

export default function LandingPage() {
  const paywall = isBillingEnabled();
  const ctaHref = paywall ? '/login?mode=signup' : '/app';
  const ctaLabel = paywall ? `Get started — ${MONTHLY_PRICE_SHORT}` : 'Open app';

  return (
    <MarketingShell>
      <section className="pt-8 sm:pt-14">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Your work homebase
        </p>
        <h1 className="mb-5 max-w-xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Do you. Daywinner bot keeps you aligned.
        </h1>
        <p className="mb-5 max-w-lg text-lg leading-relaxed text-slate-600">
          Daywinner bot is a homebase for the work you do that helps you print $$$. It keeps your
          workflow exactly the same — but helps you stay organized while removing distractions.
        </p>
        <p className="mb-5 max-w-lg text-base leading-relaxed text-slate-500">
          Think of it like someone giving you a nice little organized cubby for your most important work.
          They then placed you on a cozy little couch while blocking out your most common distractions.
        </p>
        <p className="mb-8 max-w-lg text-base leading-relaxed text-slate-500">
          It doesn&apos;t restrict your work movement like most software — it just gives you structure. You
          just do you, and daywinner bot will support you.
        </p>

        <div className="mb-10 flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-slate-800"
          >
            {ctaLabel}
          </Link>
          {paywall ? (
            <span className="text-sm text-slate-500">Create account, then subscribe</span>
          ) : null}
        </div>

        <ul className="mb-12 space-y-3 border-t border-slate-200 pt-8">
          {features.map(feature => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="mt-0.5 text-slate-400" aria-hidden>
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {paywall ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-1 text-sm font-semibold text-slate-900">Simple pricing</p>
            <p className="mb-4 text-3xl font-bold text-slate-900">
              {MONTHLY_PRICE_LABEL}<span className="text-base font-semibold text-slate-500">/month</span>
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              One plan. Cancel anytime from your account. We only store your login and subscription —
              not your projects or notes.
            </p>
          </div>
        ) : null}
      </section>

      <footer className="mt-16 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-slate-600 no-underline hover:text-slate-900">
          Sign in
        </Link>
        <Link
          href="/privacy/focus-extension"
          className="font-semibold text-slate-600 no-underline hover:text-slate-900"
        >
          Extension privacy
        </Link>
      </footer>
    </MarketingShell>
  );
}
