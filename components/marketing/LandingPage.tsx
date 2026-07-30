import Link from 'next/link';
import { isBillingEnabled, isPaywallDisabled } from '@/lib/stripe/config';
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_SHORT } from '@/lib/billing/price';
import MarketingShell from './MarketingShell';

const features = [
  "Work timer with soft & hard session locks (so you can't distract yourself)",
  'A homebase for your most important projects, tasks, notes, and context links in 1 easy-to-use, central location',
  'End-of-day reports of what you worked on / how long you worked (for yourself to be proud of) or that you can send to an accountability partner via email in 1 easy click',
  'Chrome extension for site blocking + infraction tracker to track exactly how many times you distracted yourself in a work session (and for the day)',
];

const whoItsFor = [
  {
    title: 'You’re building something on your own',
    body: 'Indie app, micro-SaaS, newsletter, solo project. You wear every hat. Daywinner keeps projects, timer, and blocklist in one spot so ship day doesn’t turn into scroll day.',
  },
  {
    title: 'You freelance for multiple clients',
    body: 'Designer, dev, writer, VA — juggling 2–5 clients. One place per client. Timed blocks. Notes on the task so switching doesn’t wreck your brain.',
  },
  {
    title: 'You make content and run the business',
    body: 'YouTube, TikTok, podcast, courses. Creating is half of it; DMs, sponsors, and admin are the rest. Separate deep work from the boring stuff that actually pays.',
  },
  {
    title: 'You work from home at a real job',
    body: 'Analyst, PM, marketer, ops. Your calendar fills up fast. Protect 90 minutes before Slack and email take the whole day.',
  },
  {
    title: 'You’re in school but treating it seriously',
    body: 'Grad school, bootcamp, teaching yourself design or code. Same laptop for everything. Clock in, lock distractions, work like it matters.',
  },
  {
    title: 'You have a day job and a side thing',
    body: 'Full-time plus Etsy, consulting, content, or whatever you’re building at night. An hour after work is gold — make it count.',
  },
  {
    title: 'You work in sprints but hate starting',
    body: 'You get stuff done — once you’re in. Starting and staying off your phone is the hard part. Simple setup: projects, timer, site lock. No 100-feature todo app.',
  },
  {
    title: 'Your job is calls, emails, and outreach',
    body: 'Sales, recruiting, real estate, agency new business. Prospecting always gets pushed to “later.” Block morning time and work from a list that’s actually yours.',
  },
  {
    title: 'You run a small team but still do the work',
    body: 'A few employees, lots of client fires. This isn’t the team’s project board — it’s for your tasks when nobody’s telling you what to do next.',
  },
  {
    title: 'You’re a consultant or coach',
    body: 'Strategy, career, fitness, business. Your calendar is full of calls; prep and follow-up get skipped. Block time for the work between meetings.',
  },
  {
    title: 'You’re writing a thesis or doing deep research',
    body: 'PhD, postdoc, or serious self-directed learning. Long days, easy detours. Blocks for reading and writing, with fewer “just five minutes on my phone” moments.',
  },
  {
    title: 'You work with your hands, laptop at night',
    body: 'Electrician, photographer, trainer — job site by day, invoices and bookings after dinner. Short evening blocks so admin actually gets done.',
  },
  {
    title: 'You’re job hunting for real',
    body: 'Not just browsing listings — applying, networking, prepping interviews. Treat the search like a job: timed blocks, one target at a time.',
  },
  {
    title: 'You work from home with kids in the mix',
    body: 'Nap time, early morning, whatever window you get. You can’t waste twenty minutes. One task, timer on, phone away.',
  },
];

export default function LandingPage() {
  const paywall = isBillingEnabled();
  const paywallOff = isPaywallDisabled();
  const ctaHref = paywall ? '/subscribe' : paywallOff ? '/login?mode=signup&next=/intro/chrome' : '/app';
  const ctaLabel = paywall ? `Subscribe — ${MONTHLY_PRICE_SHORT}` : paywallOff ? 'Get started' : 'Open app';

  return (
    <MarketingShell>
      <section className="pt-8 sm:pt-14">
        <h1 className="mb-5 max-w-xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Fighter pilots have their cockpit. You have your daywinner bot.
        </h1>
        <p className="mb-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Daywinner bot is your &ldquo;productivity dashboard&rdquo; tool that helps you WIN THE DAY by helping
          you organize your work &amp; block distractions like 7/8 figure entrepreneurs so you can hit your first
          6 figures, finish/launch that project, overdeliver for your clients, get that remote job, or study
          efficiently — and make more progress in 30 days than you have in the past 5 years.
        </p>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
          Built around the exact workflow of people making multiple hundreds of thousands of dollars per month,
          daywinner bot helps you prioritize the 1 most important task (or tasks) for the day &amp; work until
          completed by creating timed work blocks &amp; force-blocking out your most distracting tabs/websites. You
          now not only have a &ldquo;homebase&rdquo; for your most important work, but you can also track how long
          you worked on what task each day, and even keep yourself accountable by sending daily reports to friends
          or accountability buddies (or yourself).
        </p>

        <div className="mb-10 flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-slate-800"
          >
            {ctaLabel}
          </Link>
          {paywall ? (
            <span className="text-sm text-slate-500">Subscribe first, then create your account</span>
          ) : paywallOff ? (
            <span className="text-sm text-slate-500">Paywall off for testing — create an account to try the full flow</span>
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

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Who it&apos;s for</p>
        <h2 className="mb-4 max-w-xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
          Already working? Daywinner is your homebase.
        </h2>
        <p className="mb-10 max-w-lg text-base leading-relaxed text-slate-600">
          Daywinner isn&apos;t for &ldquo;someday I&apos;ll get organized.&rdquo; It&apos;s for people who are already
          building, shipping, selling, studying, or grinding — and need one calm place to focus, track projects, and
          block distractions. Same workflow. Less chaos.
        </p>

        <ul className="mb-10 grid gap-4 sm:grid-cols-2">
          {whoItsFor.map(item => (
            <li
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="mb-2 text-sm font-bold leading-snug text-slate-900">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
            </li>
          ))}
        </ul>

        <p className="mb-8 max-w-lg text-base leading-relaxed text-slate-600">
          If you&apos;re already doing the work — building, billing, creating, applying, or grinding on the side —
          Daywinner gives you structure without changing how you move.
        </p>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-100/80 p-5">
          <p className="mb-1 text-sm font-bold text-slate-900">Is this for teams?</p>
          <p className="text-sm leading-relaxed text-slate-600">
            Daywinner is personal — for your projects, your timer, your focus. Not corporate project-management
            theater. If you&apos;re the person doing the work (not only assigning it), you&apos;re who we built this for.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-slate-800"
          >
            {ctaLabel}
          </Link>
          <span className="text-sm text-slate-500">Chrome recommended for focus blocking</span>
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-slate-600 no-underline hover:text-slate-900">
          Sign in
        </Link>
        <Link href="/terms" className="font-semibold text-slate-600 no-underline hover:text-slate-900">
          Terms
        </Link>
        <Link href="/privacy" className="font-semibold text-slate-600 no-underline hover:text-slate-900">
          Privacy
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
