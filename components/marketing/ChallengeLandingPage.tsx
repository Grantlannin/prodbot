import Link from 'next/link';
import Image from 'next/image';
import { isBillingDemoFlow, isBillingEnabled, isPaywallDisabled } from '@/lib/stripe/config';
import { MONTHLY_PRICE_LABEL, STARTER_PRICE_LABEL } from '@/lib/billing/price';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/site';
import MarketingShell from './MarketingShell';
import StartCheckoutButton from './StartCheckoutButton';

const ctaBtnClass =
  'inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 no-underline shadow-sm transition hover:bg-slate-800 disabled:opacity-70';

const steps = [
  {
    n: '1',
    title: 'Click “Start challenge” to begin for $1.',
    body: 'One buck gets you in. That’s it — no maze, no upsell wall.',
  },
  {
    n: '2',
    title: 'Grab your challenge bundle.',
    body: 'That’s your Daywinner bot — the personal bot that keeps you organized and blocks social media for you — plus the simple system behind it.',
  },
  {
    n: '3',
    title: 'Tee up tomorrow’s #1 task.',
    body: 'Use your bot to set your most important task, lock your work time, then show up the next day and kill it.',
  },
  {
    n: '4',
    title: 'Repeat the loop for 7 days.',
    body: 'Wind down, tee up, show up, track the simple metrics. Stack days until the habit is louder than the excuses.',
  },
];

export default function ChallengeLandingPage() {
  const paywall = isBillingEnabled();
  const paywallOff = isPaywallDisabled();
  const demoFlow = isBillingDemoFlow();
  const useCheckout = paywall || demoFlow;
  const fallbackHref = paywallOff ? '/login?mode=signup&next=/app' : '/app';

  return (
    <MarketingShell>
      <section className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center py-8">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <p className="mb-4 max-w-xl text-sm font-semibold leading-snug text-slate-600 sm:text-base">
            For anyone who&apos;s had (or is having) trouble actually doing the work that moves their life forward.
            This is for{' '}
            <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-bold text-white">YOU</span>!
          </p>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Daywinner bot</p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            The 7-day Get Sh*t Done Challenge
          </h1>
          <p className="mb-6 max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg">
            Everything you need (but haven&apos;t yet found) to{' '}
            <span className="font-semibold text-slate-900">*actually*</span> get sh*t done
          </p>
          <Image
            src="/marketing/daywinner-bot-hero.png"
            alt="Daywinner bot"
            width={1400}
            height={934}
            className="mb-6 h-auto w-full max-w-[320px] sm:max-w-[400px]"
            unoptimized
            priority
          />
          <div className="flex flex-col items-center gap-2">
            {useCheckout ? (
              <StartCheckoutButton className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">Start challenge — {STARTER_PRICE_LABEL}</span>
              </StartCheckoutButton>
            ) : (
              <Link href={fallbackHref} className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">Start challenge — {STARTER_PRICE_LABEL}</span>
              </Link>
            )}
            <p className="text-xs text-slate-500 sm:text-sm">
              Then {MONTHLY_PRICE_LABEL}/mo after day 7. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">What the challenge is</p>
          <h2 className="mb-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            7 days. One simple system. More actually productive sh*t than you&apos;ve ever done.
          </h2>
          <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
            The 7-day Get Sh*t Done Challenge is a 7-day period where you run the “Simple productivity system” —
            using both your personal productivity bot &amp; the task-setup system behind it — to get you doing more
            “actually productive sh*t” than you&apos;ve ever done before. No more busywork, doing the wrong stuff,
            &amp; spinning your wheels.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-10 flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              How does it work?
            </h2>
            <span aria-hidden className="mt-1.5 text-5xl font-bold leading-none text-red-500 sm:text-6xl">
              ↓
            </span>
          </div>
          <ol className="space-y-8">
            {steps.map(step => (
              <li key={step.n} className="text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Step {step.n}</p>
                <h3 className="mb-2 text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            {useCheckout ? (
              <StartCheckoutButton className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">Start challenge — {STARTER_PRICE_LABEL}</span>
              </StartCheckoutButton>
            ) : (
              <Link href={fallbackHref} className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">Start challenge — {STARTER_PRICE_LABEL}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-600">Here&apos;s the issue</p>
          <h2 className="mb-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Your day is won or lost before it even begins.
          </h2>
          <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
            The reason you can&apos;t get sh*t done is because your preparation has been wrong. This is what 99% of
            people don&apos;t understand. Get this 1 technique down, and you will out-produce &amp; get ahead of everyone
            you know. They will wonder what happened to you.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            What happens after the 7 days?
          </p>
          <h2 className="mb-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            That&apos;s up to you.
          </h2>
          <p className="mb-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            When your Daywinner bot trial ends (on day 7), we will automatically re-bill you at {MONTHLY_PRICE_LABEL}.
            If you&apos;d like to cancel, simply email us or reply to the email with{' '}
            <span className="font-semibold text-slate-900">CANCEL</span> and it will automatically cancel.
          </p>
          <p className="text-sm text-slate-500">
            Support:{' '}
            <a href={SUPPORT_MAILTO} className="font-semibold text-slate-700 no-underline hover:text-slate-900">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            {useCheckout ? (
              <StartCheckoutButton className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">Start challenge — {STARTER_PRICE_LABEL}</span>
              </StartCheckoutButton>
            ) : (
              <Link href={fallbackHref} className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">Start challenge — {STARTER_PRICE_LABEL}</span>
              </Link>
            )}
            <Link
              href="/worksheet"
              className="text-sm font-semibold text-slate-600 no-underline transition hover:text-slate-900"
            >
              Preview the printable challenge worksheet →
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
