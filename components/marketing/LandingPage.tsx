import Link from 'next/link';
import Image from 'next/image';
import { isBillingDemoFlow, isBillingEnabled, isPaywallDisabled } from '@/lib/stripe/config';
import { MONTHLY_PRICE_SHORT } from '@/lib/billing/price';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/site';
import MarketingShell from './MarketingShell';
import StartCheckoutButton from './StartCheckoutButton';

const ctaBtnClass =
  'inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 no-underline shadow-sm transition hover:bg-slate-800 disabled:opacity-70';

function SectionCta({
  label,
  className,
  checkout,
  href,
}: {
  label: string;
  className?: string;
  checkout: boolean;
  href: string;
}) {
  return (
    <div className={`mb-2 flex justify-center ${className ?? 'mt-6'}`}>
      {checkout ? (
        <StartCheckoutButton showPrice className={ctaBtnClass}>
          {label}
        </StartCheckoutButton>
      ) : (
        <Link href={href} className={ctaBtnClass}>
          <span className="text-sm font-semibold text-white">{label}</span>
          <span className="text-sm font-medium text-slate-500 line-through">$12.99/mo</span>
          <span className="text-sm font-semibold text-white">{MONTHLY_PRICE_SHORT}</span>
        </Link>
      )}
    </div>
  );
}

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
  const demoFlow = isBillingDemoFlow();
  const useCheckout = paywall || demoFlow;
  const fallbackHref = paywallOff ? '/login?mode=signup&next=/app' : '/app';

  return (
    <MarketingShell>
      <section className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center py-6">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Introducing</p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Daywinner bot</h1>
          <Image
            src="/marketing/daywinner-bot-hero.png"
            alt="Daywinner bot presenting the productivity dashboard"
            width={1400}
            height={934}
            className="mb-5 h-auto w-full max-w-[400px] sm:max-w-[520px]"
            unoptimized
            priority
          />
          <p className="max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-relaxed">
            Daywinner bot is your personal productivity dashboard + robot that helps you{' '}
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
              win the day
            </span>{' '}
            by blocking your most important distractions &amp; walks you through the same organizational flows that
            7-figure entrepreneurs use to keep you hyper-organized, daily.
          </p>
          <p className="mt-2 text-sm text-slate-500 sm:text-[15px]">
            (your bot sits as a normal tab on your browser, next to your other ones, while you work)
          </p>
          <div className="mt-5 flex flex-col items-center gap-2">
            {useCheckout ? (
              <StartCheckoutButton showPrice className={ctaBtnClass}>
                let&apos;s go
              </StartCheckoutButton>
            ) : (
              <Link href={fallbackHref} className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">let&apos;s go</span>
                <span className="text-sm font-medium text-slate-500 line-through">$12.99/mo</span>
                <span className="text-sm font-semibold text-white">{MONTHLY_PRICE_SHORT}</span>
              </Link>
            )}
            <p className="text-xs text-slate-500 sm:text-sm">
              No commitments. No hidden fees. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pb-2 pt-5 sm:pb-3 sm:pt-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-0 text-center">
            <h2 className="mb-6 text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:mb-8 sm:text-4xl sm:leading-snug">
              Block Social Media.
              <br />
              Set Up Your #1 Most Important Task Daily.
              <br />
              <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
                Win
              </span>{' '}
              The Day.
            </h2>
            <Image
              src="/marketing/sessions-flow-steps.png"
              alt="Step 1 Choose your task > Step 2 set your work timer > Step 3 Begin working (with social media blocked)"
              width={2560}
              height={436}
              className="mx-auto mb-6 h-auto w-full"
              unoptimized
              priority
            />
            <video
              className="mb-5 h-auto w-full"
              src="/marketing/sessions-tracked.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              aria-label="Daywinner dashboard with sessions tracked by task"
            />
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
              Every task is linked to your tracker &amp; timer, which not only shows you exactly what you worked on
              &amp; for how long — but also forces you to stay organized. Because if you don&apos;t organize, you
              can&apos;t start the session.
            </p>
            <SectionCta checkout={useCheckout} href={fallbackHref} label="I'm ready to transcend" />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-3 sm:py-4">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            HERE&apos;S HOW IT WORKS:
          </h2>
          <span aria-hidden className="mt-1.5 text-5xl font-bold leading-none text-red-500 sm:text-6xl">
            ↓
          </span>
        </div>
      </section>

      <section className="space-y-6 border-t border-slate-200 pt-4 sm:pt-5">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Step 1: Organize your most important tasks into 1 place (which links them to your tracker)
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            You can now store links and notes in tasks/projects specifically, instead of losing them all over your
            computer.
          </p>
          <Image
            src="/marketing/projects.jpg"
            alt="Projects dashboard with tasks and subtasks"
            width={1024}
            height={443}
            className="h-auto w-full max-w-3xl"
            unoptimized
          />
        </div>

        <div className="flex justify-center py-2" aria-hidden>
          <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Step 2: Choose the most important task that will <em>actually</em> move the ball forward for you
          </h2>
          <Image
            src="/marketing/choose-task.jpg"
            alt="What are you working on — choose a task"
            width={1024}
            height={672}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="flex justify-center py-2" aria-hidden>
          <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Step 3: Pick a focus session length
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            (25 mins for pomodoro, 45 mins for the ambitious, 2+ hours for the ruthless - your task is linked to your
            timer, and your chosen sites are blocked for the duration of your work session)
          </p>
          <Image
            src="/marketing/step3-timer.jpg"
            alt="Focus session length options"
            width={1024}
            height={717}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="flex justify-center py-2" aria-hidden>
          <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Step 4: Choose the strength of your distraction blocker — &ldquo;soft lock&rdquo; or &ldquo;hard
            lock&rdquo;
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            Block any distracting website you want. During your work session, you will be unable to access the sites you
            choose until your timer hits zero. Soft lock makes you wait 2 minutes for access again (you&apos;ll usually
            just start working more), &amp; hard lock &ldquo;locks you in&rdquo; &amp; blocks the sites entirely until
            your work timer hits zero.
          </p>
          <Image
            src="/marketing/step4-lock.jpg"
            alt="Focus session soft and hard lock options"
            width={1024}
            height={723}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="flex justify-center py-2" aria-hidden>
          <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Step 5: Put in an AMAZING tracked work session (while all social media sites are blocked, so it&apos;s just
            you &amp; the work)
          </h2>
          <Image
            src="/marketing/task-tracking.jpg"
            alt="Work today and time by project tracking"
            width={1024}
            height={220}
            className="h-auto w-full"
            unoptimized
          />
          <SectionCta checkout={useCheckout} href={fallbackHref} label="I'm ready to WORK" className="mt-10" />
        </div>
      </section>

      <section className="space-y-6 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-6 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Congrats. You just had a more productive 4 hours than you&apos;ve had in the past 4 years. But now, it&apos;s
            time for the real magic...
          </h2>
          <Image
            src="/marketing/daywinner-bot-salt-ws.png"
            alt="Daywinner bot sprinkling W's — now time for the real magic"
            width={1024}
            height={1536}
            className="mb-6 h-auto w-full max-w-[220px] sm:max-w-[280px]"
            unoptimized
          />
          <p className="mb-4 text-base font-semibold tracking-tight text-slate-600 sm:text-lg">
            introducing... your secret weapon:
          </p>
          <div className="relative mb-8 w-full max-w-xl">
            <div className="overflow-hidden rounded-2xl border-[3px] border-slate-900 bg-white px-6 py-6 shadow-[6px_6px_0_0_#ef4444] sm:px-10 sm:py-7">
              <svg
                className="mx-auto mb-3 h-6 w-40 text-teal-500 sm:h-7 sm:w-48"
                viewBox="0 0 200 28"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 14 C14 14 18 4 30 4 C42 4 46 24 58 24 C70 24 74 8 86 8 C98 8 102 20 114 20 C126 20 130 6 142 6 C154 6 158 22 170 22 C182 22 186 14 198 14"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-[2rem] font-bold leading-none tracking-tight text-slate-900 sm:text-5xl">
                The wind-down flow
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500 sm:text-base">
                Task reflection + task prep exactly like 7-figure entrepreneurs do it
              </p>
            </div>
          </div>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            99% of people just fill their day with busywork &amp; don&apos;t actually accomplish anything... but your
            Daywinner bot simply doesn&apos;t allow that to happen. Your Daywinner bot knows you&apos;re destined for
            the 1%. And this is why it holds you accountable &amp; asks you...
          </p>
          <h2 className="mb-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            &ldquo;What Did You <em>actually</em> Get Done Today?&rdquo;
          </h2>
          <Image
            src="/marketing/wind-down.jpg"
            alt="Wind down bot asking what you got done today"
            width={942}
            height={1024}
            className="mb-6 h-auto w-full max-w-md sm:max-w-lg"
            unoptimized
          />
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
            There is nowhere to hide. Your bot will ask you what you got done, and you are able to see if it was the
            most important thing, or if you just &ldquo;productively procrastinated&rdquo;
          </p>
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Your bot then puts you through a wind-down flow that forces you to stay organized &amp; prioritize the 1
            most important task for tomorrow (and it walks you through the whole thing, zero effort on your end)
          </h2>
          <Image
            src="/marketing/wind-down-context.jpg"
            alt="Wind down flow adding context and organizing for tomorrow"
            width={1024}
            height={955}
            className="mb-10 h-auto w-full max-w-2xl"
            unoptimized
          />
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            ....And then when finished with the wind down flow - what are you left with, before the day even starts
            tomorrow?
          </h2>
          <p className="mb-6 max-w-2xl text-2xl font-extrabold leading-[1.55] tracking-tight text-green-600 sm:text-4xl">
            The single most important task you need to do, already ready to go.
          </p>
          <div className="relative mx-auto mb-8 w-full max-w-[22rem] sm:max-w-md">
            <div className="relative mx-auto aspect-square w-full max-w-[360px]">
              <svg
                className="pointer-events-none absolute inset-0 z-20 h-full w-full text-green-600"
                viewBox="0 0 360 360"
                aria-hidden
              >
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                  <g key={deg} transform={`rotate(${deg} 180 180)`}>
                    <path
                      d="M180 16 L180 48"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M164 40 L180 60 L196 40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}
              </svg>
              <div className="absolute inset-0 z-0 flex items-center justify-center">
                <Image
                  src="/marketing/tomorrow-task-list.png"
                  alt="Tomorrow's task list — finish onboarding"
                  width={460}
                  height={200}
                  className="h-auto w-[58%] max-w-[200px] rounded-lg bg-white"
                  unoptimized
                />
              </div>
            </div>
          </div>
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Boom - you&apos;ve just organized your dashboard &amp; &ldquo;tee&apos;d up&rdquo; tomorrow&apos;s
            most important task like a 7-figure entrepreneur. Pair that with your social media blocker &amp; timer,
            and you&apos;re about to{' '}
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
              WIN THE DAY
            </span>
            . It&apos;s been won before it even started.
          </p>
          <SectionCta checkout={useCheckout} href={fallbackHref} label="I'm ready to dominate" />
        </div>
      </section>


      <section className="space-y-6 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-6 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            ...But what if it&apos;s a &ldquo;low&rdquo; day? One of those days where things feel harder than usual?
          </h2>
          <Image
            src="/marketing/daywinner-bot-flow-for-that.png"
            alt="Stick figure at laptop thinking ugh I don't wanna do this, Daywinner bot with cape putting a hand on his shoulder saying I've got a flow for that"
            width={1536}
            height={1024}
            className="mb-6 h-auto w-full max-w-xl sm:max-w-2xl"
            unoptimized
          />
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Your daywinner bot also has custom flows to help you in specific situations (that I personally use).
          </p>
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Trouble starting a task? The bot has an exact flow for that
          </h2>
          <Image
            src="/marketing/stuck-start.jpg"
            alt="Stuck help options — trouble starting"
            width={1024}
            height={654}
            className="h-auto w-full border-4 border-red-500"
            unoptimized
          />
        </div>

        <div className="flex justify-center py-2" aria-hidden>
          <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Let your bot walk you through your own work resistance to the promised land
          </h2>
          <Image
            src="/marketing/stuck-flow.jpg"
            alt="Bot walking you through work resistance"
            width={1024}
            height={808}
            className="h-auto w-full border-4 border-red-500"
            unoptimized
          />
        </div>

        <div className="flex flex-col items-center text-center pt-10">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            trouble organizing your task list? The bot has a flow for that
          </h2>
          <Image
            src="/marketing/organize-start.jpg"
            alt="Stuck help options — trouble organizing task list"
            width={1024}
            height={599}
            className="h-auto w-full border-4 border-red-500"
            unoptimized
          />
        </div>

        <div className="flex justify-center py-2" aria-hidden>
          <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Let your bot help you tee up the most important task that will actually move you forward
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            That gets automatically linked to your tracker, ready to begin.
          </p>
          <Image
            src="/marketing/organize-flow.jpg"
            alt="Bot teeing up the most important task"
            width={1024}
            height={898}
            className="h-auto w-full border-4 border-red-500"
            unoptimized
          />
          <SectionCta checkout={useCheckout} href={fallbackHref} label="Need my bot ASAP" />
        </div>

        <div className="flex flex-col items-center text-center pt-10">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Need additional accountability?
          </h2>
          <p className="mb-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            You can turn every task you worked on into an EOD report &amp; send it to an accountability buddy (or
            yourself) easily via email with 1 click so they can see the{' '}
            <span className="underline decoration-[2px] underline-offset-2">truth</span> of your productivity.
          </p>
          <Image
            src="/marketing/eod-send.jpg"
            alt="Send EOD to partner modal"
            width={1200}
            height={800}
            className="mb-6 h-auto w-full"
            unoptimized
          />
          <h3 className="mb-3 max-w-2xl text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            Send EOD to your partner — or yourself.
          </h3>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Opens Gmail (or your mail app) with today&apos;s report pre-filled: what you got done, insights, work
            time, tomorrow. You review and hit Send — nothing leaves Daywinner automatically.
          </p>
          <SectionCta checkout={useCheckout} href={fallbackHref} label="GIVE ME MY BOT" />
        </div>
      </section>

      <section className="pt-12 sm:pt-16">
        <div className="mb-10 flex flex-col items-center text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Who it&apos;s for</p>
          <h2 className="mb-4 max-w-xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            Already working? Daywinner is your homebase.
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-slate-600">
            Daywinner isn&apos;t for &ldquo;someday I&apos;ll get organized.&rdquo; It&apos;s for people who are already
            building, shipping, selling, studying, or grinding — and need one calm place to focus, track projects, and
            block distractions. Same workflow. Less chaos.
          </p>
        </div>

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

        <p className="mx-auto mb-8 max-w-lg text-center text-base leading-relaxed text-slate-600">
          If you&apos;re already doing the work — building, billing, creating, applying, or grinding on the side —
          Daywinner gives you structure without changing how you move.
        </p>

        <div className="flex flex-col items-center">
          <SectionCta checkout={useCheckout} href={fallbackHref} label="YES. I'M IN." />
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-slate-600 no-underline hover:text-slate-900">
          Sign in
        </Link>
        <a href={SUPPORT_MAILTO} className="font-semibold text-slate-600 no-underline hover:text-slate-900">
          {SUPPORT_EMAIL}
        </a>
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
