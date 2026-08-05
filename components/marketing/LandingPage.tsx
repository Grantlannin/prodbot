import Link from 'next/link';
import Image from 'next/image';
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
          <p className="mt-2 text-sm text-slate-500 sm:text-[15px]">(no download required)</p>
          <div className="mt-5 flex flex-col items-center gap-2">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 no-underline shadow-sm transition hover:bg-slate-800"
            >
              <span className="text-sm font-semibold text-white">let&apos;s go</span>
              <span className="text-sm font-medium text-slate-500 line-through">$12.99/mo</span>
              <span className="text-sm font-semibold text-white">{MONTHLY_PRICE_SHORT}</span>
            </Link>
            <p className="text-xs text-slate-500 sm:text-sm">
              No commitments. No hidden fees. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pb-2 pt-5 sm:pb-3 sm:pt-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-0 text-center">
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
              Every session is tracked by task, which not only shows you exactly what you worked on &amp; for how long —
              but also forces you to stay organized. Because if you don&apos;t organize, you can&apos;t start the
              session.
            </p>
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
            (25 mins for pomodoro, 45 mins for the ambitious, 2+ hours for the ruthless)
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
            your work block is complete.
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
            Step 5: Put in an AMAZING work session, and allow your daywinner bot to show you exactly how long you went
            at it + what you did (while all social media sites are blocked, so it&apos;s just you &amp; the work)
          </h2>
          <Image
            src="/marketing/task-tracking.jpg"
            alt="Work today and time by project tracking"
            width={1024}
            height={220}
            className="h-auto w-full"
            unoptimized
          />
        </div>
      </section>

      <section className="border-t border-slate-200 pb-14 pt-12 sm:pb-20 sm:pt-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-12 text-center">
            <Image
              src="/marketing/daywinner-bot-flying.png"
              alt="Daywinner bot organizing for you while you print cash — stick figure on laptop riding the flying bot"
              width={1513}
              height={1024}
              className="mx-auto mb-4 h-auto w-full max-w-[260px] sm:max-w-[320px]"
              unoptimized
            />
            <p className="mb-3 text-sm text-slate-500 sm:text-[15px]">
              ADHD brain &amp; have trouble organizing?
            </p>
            <h2 className="text-[1.75rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-[2.35rem] sm:leading-[1.15]">
              Let Your Personal Productivity Robot Take You To The Promised Land.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-relaxed">
              Your day is won or lost before it starts. Most people begin working (and lose their day) by figuring what
              to do instead of <em>actually</em> doing it. High performers know this — which is why they prep the night
              before. That&apos;s what your bot does: it guides you through a quick daily planning process (linked to
              your personal dashboard) so you end each day with one thing ready for tomorrow — your single most
              important task. Zero friction.
            </p>
          </div>

          <div className="mb-8 text-center">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Daywinner bot is{' '}
              <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-white">
                4 things
              </span>{' '}
              in 1
            </h3>
          </div>

          <ol className="space-y-0 divide-y divide-slate-200 border-y border-slate-200">
            <li className="flex gap-5 py-6 sm:gap-7 sm:py-7">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base"
              >
                01
              </span>
              <div>
                <p className="mb-1 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  Productivity dashboard
                </p>
                <p className="text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-relaxed">
                  Your work homebase — where all of your most important tasks live.
                </p>
              </div>
            </li>
            <li className="flex gap-5 py-6 sm:gap-7 sm:py-7">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base"
              >
                02
              </span>
              <div>
                <p className="mb-1 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  Digital work session timer
                </p>
                <p className="text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-relaxed">
                  Track specific tasks &amp; see exactly how long you worked for.
                </p>
              </div>
            </li>
            <li className="flex gap-5 py-6 sm:gap-7 sm:py-7">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base"
              >
                03
              </span>
              <div>
                <p className="mb-1 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  Website blocker
                </p>
                <p className="text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-relaxed">
                  Blocks any website you want during your focus sessions.
                </p>
              </div>
            </li>
            <li className="flex gap-5 py-6 sm:gap-7 sm:py-7">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base"
              >
                04
              </span>
              <div>
                <p className="mb-1 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  Entrepreneur workflows
                </p>
                <p className="text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-relaxed">
                  The same flows 7-figure entrepreneurs use to find their most important task, destroy
                  resistance, and stay organized at the end of the day. You turn off your mind —
                  Daywinner bot walks you through exactly what to do.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-12 w-full max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">The problem</p>
            <h2 className="text-[1.85rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-[2.5rem] sm:leading-[1.15]">
              You&apos;re Not Undisciplined. The World&apos;s Most Addictive Thing Ever Created (Social Media) Is
              Accessible On The Device That You&apos;re Supposed To Get Stuff Done With. Which Is Pretty Insane If You
              Think About It. This Is The 1st Thing Daywinner Bot Fixes.
            </h2>
            <Image
              src="/marketing/focus-session-branded.jpg"
              alt="Focus session active — add any distracting website to your block list and Daywinner blocks it for you"
              width={1400}
              height={1000}
              className="mx-auto mt-8 h-auto w-full max-w-lg"
              unoptimized
            />
          </div>

          <div className="mb-14 w-full max-w-2xl text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">The fix</p>
            <p className="mb-6 text-lg leading-relaxed text-slate-700 sm:text-xl sm:leading-relaxed">
              Daywinner bot is your personal robot that helps you win the day. And it does this by:
            </p>
            <ol className="space-y-5">
              <li className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 w-7 shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-400"
                >
                  01
                </span>
                <p className="text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-relaxed">
                  Providing you with a work homebase (your productivity dashboard) that exists as a normal tab in your
                  browser (download nothing)
                </p>
              </li>
              <li className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 w-7 shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-400"
                >
                  02
                </span>
                <p className="text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-relaxed">
                  Blocking out every social media site / any site you want to block that distracts you (with the click
                  of a button)
                </p>
              </li>
              <li className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 w-7 shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-400"
                >
                  03
                </span>
                <p className="text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-relaxed">
                  Helps you set up your &ldquo;most important task&rdquo; like 7-figure entrepreneurs do so all
                  that&apos;s left is you &amp; the most important thing you need to do. Zero other distractions.
                </p>
              </li>
            </ol>
          </div>
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Fighter Pilots Have Their Cockpit. You Have Your Daywinner Bot.
          </h2>
          <blockquote className="mb-5 max-w-2xl text-base italic leading-relaxed text-slate-600 sm:text-lg">
            &ldquo;my entire workflow consists of google docs, claude, and my daywinner bot. it&apos;s simpler than ever
            before and I am getting 10x done what I used to get done. Having daywinner as my work homebase changed the
            game for me because i can just isolate my most important task, put a timer on it, and block every
            distraction. I wish I had this 10 years ago. I&apos;d be a f****** billionaire&rdquo;
          </blockquote>
          <p className="mb-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Daywinner bot is a productivity dashboard that functions as your &ldquo;work homebase&rdquo; — a tab in
            your browser that helps you organize &amp; finish the tasks you need to do to hit your first six figures
            (or make your first $1 online), finally build &amp; launch the project you&apos;ve been sitting on, pass
            any exam, or land the remote job you actually want.
          </p>
          <p className="mb-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Here&apos;s the key: You don&apos;t have a discipline problem — you just have no structure. Until now.
            Daywinner bot helps you build your tasks and work sessions the way 7-figure entrepreneurs run theirs while
            blocking your most distracting websites, so you get sh*t done and make more progress in 30 days than you
            have in the last 5 years.
          </p>
          <Image
            src="/marketing/dashboard.jpg"
            alt="Daywinner bot dashboard"
            width={1024}
            height={522}
            className="mb-8 h-auto w-full"
            unoptimized
            priority
          />

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-slate-800"
            >
              {ctaLabel}
            </Link>
            {paywall ? (
              <span className="text-sm text-slate-500">Subscribe first, then create your account</span>
            ) : paywallOff ? (
              <span className="text-sm text-slate-500">
                Paywall off for testing — create an account to try the full flow
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-[#faf8f5] px-6 py-10 shadow-sm sm:px-12 sm:py-14">
          <div className="mb-8 space-y-1 border-b border-slate-200 pb-6 font-mono text-sm text-slate-700">
            <p>
              <span className="text-slate-500">FROM:</span> productivity tool hater
            </p>
            <p>
              <span className="text-slate-500">RE:</span> Wait, daywinner bot actually works?
            </p>
          </div>
          <div className="space-y-6 text-left text-[1.05rem] leading-[1.85] text-slate-800 sm:text-lg">
            <p>
              Hey — it&apos;s me, The OG productivity tool hater. I genuinely hate all productivity tools.
            </p>
            <p>Why?</p>
            <p>
              Because every productivity tool that&apos;s ever been put out is fake &amp; doesn&apos;t actually work.
              They all &ldquo;sound good&rdquo; but don&apos;t actually do anything and you aren&apos;t actually getting
              anything done.
            </p>
            <p>
              But your daywinner bot is different. Your daywinner bot isn&apos;t just a random productivity tool that
              says &ldquo;good luck&rdquo;. It has <em>actual</em> workflows, ACTUAL systems for you to follow. It will
              walk you through so you can create your task list.
            </p>
            <p>
              Have ADHD and have trouble staying organized with all your stuff in 1,000 different places? Your bot&apos;s
              &ldquo;wind down flow&rdquo; walks you through a simple process to stay organized, every single evening.
            </p>

            <hr className="my-10 border-slate-300" />

            <p>
              The entire productivity industry is fake. Every productivity tool that&apos;s ever been created doesn&apos;t
              actually work. They all &ldquo;sound good&rdquo; but don&apos;t actually do anything, and you end up not
              actually getting more stuff done.
            </p>
            <p>
              And why is this so? The reason is because getting stuff done requires elimination/removal/prioritization,
              not ADDING a bunch of unimportant stuff. Getting more stuff done = <em>less</em> stuff in your way, not
              adding MORE.
            </p>
            <p>
              And this is why your daywinner bot is different. Your daywinner bot isn&apos;t just a random productivity
              tool that says &ldquo;good luck&rdquo;. It has <em>actual</em> workflows, ACTUAL systems for you to follow,
              that help you remove everything that isn&apos;t what you need to be doing. It strips away everything that
              isn&apos;t your single most important task. And that&apos;s exactly why it looks like it came from the early
              2000&apos;s. And it even helps you think through things so you know you&apos;re doing the right tasks. It
              will walk you through the same question-sequences that 7-figure entrepreneurs ask themselves so you can
              create your task list just like them.
            </p>
            <p className="min-h-[16rem] border-t border-dashed border-slate-300 pt-6 italic text-slate-400">
              (keep writing…)
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-[#faf8f5] px-6 py-10 shadow-sm sm:px-12 sm:py-12">
          <div className="space-y-6 text-left text-[1.05rem] leading-[1.85] text-slate-800 sm:text-lg">
            <p className="text-xl font-bold text-slate-900 sm:text-2xl">Now...</p>
            <p>
              simplifying your entire task list down to the 1 most important task (and then blocking all distraction to
              actually do it) is only half the battle. The other half is making sure you &ldquo;live in reality&rdquo;
              and this is where 99% of people mess up.
            </p>
            <p>
              Your mind will trick you. It will say &ldquo;we were working so hard!&rdquo; when you actually did
              nothing. It will say &ldquo;we worked for 8 hours today!!&rdquo; when you did 15 minutes of{' '}
              <em>actual work</em>, and then procrastinated for the rest.
            </p>
            <p>
              And this is where daywinner bot shines. its end-of-day workflow gets you to reflect on what you{' '}
              <em>actually</em> did, and makes sure it was the absolute best use of your time by asking 1 simple
              question daily:
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            &ldquo;What Did You Get Done Today?&rdquo;
          </h2>
          <Image
            src="/marketing/wind-down.jpg"
            alt="Wind down bot asking what you got done today"
            width={942}
            height={1024}
            className="mb-6 h-auto w-full max-w-md sm:max-w-lg"
            unoptimized
          />
          <p className="max-w-2xl text-base leading-relaxed text-slate-600">
            There is nowhere to hide. Your bot will ask you what you got done, and you are able to see if it was the
            most important thing, or if you just &ldquo;productively procrastinated&rdquo;
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Your bot then puts you through a wind-down flow that forces you to stay organized (by walking you through
            the organization process, zero effort on your end)
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            ...and then helps you choose the next important task for the following day (crucial for people with ADHD or
            hyper-active minds, like me). Your bot will walk you through the exact process that 7-figure entrepreneurs
            put themselves through to dominate everyone.
          </p>
          <Image
            src="/marketing/wind-down-context.jpg"
            alt="Wind down flow adding context and organizing for tomorrow"
            width={1024}
            height={955}
            className="mb-10 h-auto w-full max-w-2xl"
            unoptimized
          />
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            And then what are you left with, before the day even starts tomorrow?
          </h2>
          <p className="mb-6 max-w-2xl text-2xl font-extrabold leading-[1.55] tracking-tight text-green-600 underline decoration-black decoration-[3px] decoration-skip-ink-none underline-offset-[0.18em] sm:text-4xl">
            The single most important task you need to do, already ready to go.
          </p>
          <Image
            src="/marketing/tomorrow-task-list.jpg"
            alt="Tomorrow's task list ready after wind down"
            width={1024}
            height={723}
            className="mb-5 h-auto w-full max-w-md"
            unoptimized
          />
          <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-slate-200 bg-[#faf8f5] px-6 py-8 text-left shadow-sm sm:px-10 sm:py-10">
            <div className="space-y-6 text-[1.05rem] leading-[1.85] text-slate-800 sm:text-lg">
              <p>
                while everyone you know is spending their &ldquo;best energy of the day&rdquo; figuring out WHAT to do
                (which means that day is already lost), you&apos;ve already done the prep and know exactly what
                you&apos;re doing. You&apos;re now able to use your best energy of the day on stuff that{' '}
                <em>actually</em> moves your life forward consistently. And run this process out for even 1 month, and
                you&apos;re getting ahead &amp; speeding by of everyone you know. And the best part? It&apos;s not magic
                (like they think it will be while they wonder WTF got into you). It&apos;s just a repeatable SYSTEM,
                that you&apos;re following, just like 7-figure entrepreneurs do.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
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
            Let your bot walk you through your own work resistance to the promise land
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
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Let your bot help you tee up the most important task that will actually move for you forward
          </h2>
          <Image
            src="/marketing/organize-flow.jpg"
            alt="Bot teeing up the most important task"
            width={1024}
            height={898}
            className="h-auto w-full border-4 border-red-500"
            unoptimized
          />
        </div>
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

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <ul className="mb-12 space-y-3">
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
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Inside the cockpit
        </p>
        <h2 className="mb-4 max-w-xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
          The moments that keep you locked in.
        </h2>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-slate-600">
          Same dashboard you live in all day — focus locks, stuck-help, celebrations when you finish, and an
          end-of-day send that keeps you honest.
        </p>

        <div className="space-y-10">
          <article>
            <h3 className="mb-5 max-w-2xl text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              block all of the most distracting social media sites with the click of a button. Add any site you
              like.
            </h3>
            <Image
              src="/marketing/blocked-sites.jpg"
              alt="Blocked sites list with social media pack and custom sites"
              width={1024}
              height={745}
              className="h-auto w-full"
              unoptimized
            />
          </article>

          <article>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Site blocking
            </p>
            <h3 className="mb-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Focus session active
            </h3>
            <p className="mb-5 max-w-lg text-sm leading-relaxed text-slate-600">
              When you start a work block, distracting sites get locked. You see the countdown, the site that
              tried to pull you out, and a clear message: this tab is blocked until your session ends. Return
              to Daywinner — or keep working.
            </p>
            <Image
              src="/marketing/focus-session.jpg"
              alt="Focus session active — blocked site with countdown"
              width={1200}
              height={800}
              className="h-auto w-full"
              unoptimized
            />
          </article>

          <article>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Stuck help
            </p>
            <h3 className="mb-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              When friction shows up, the bot meets you there.
            </h3>
            <p className="mb-5 max-w-lg text-sm leading-relaxed text-slate-600">
              Not every day starts clean. Tap into the stuck-help flows when you&apos;re spinning — friction and
              resistance, or a messy task list — and get walked into the next move without overthinking it.
            </p>
            <Image
              src="/marketing/stuck-help.jpg"
              alt="Stuck help options — trouble starting or organizing"
              width={1200}
              height={800}
              className="h-auto w-full"
              unoptimized
            />
          </article>

          <article>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Finish energy
            </p>
            <h3 className="mb-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Close the loop like you mean it.
            </h3>
            <p className="mb-5 max-w-lg text-sm leading-relaxed text-slate-600">
              When a project hits done, Daywinner doesn&apos;t whisper. You get a full-screen celebration —
              then you hit LET&apos;S GO and move.
            </p>
            <Image
              src="/marketing/celebration.jpg"
              alt="Project completion celebration overlay"
              width={1200}
              height={800}
              className="h-auto w-full"
              unoptimized
            />
          </article>

          <article>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              End of day
            </p>
            <h3 className="mb-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Send EOD to your partner — or yourself.
            </h3>
            <p className="mb-5 max-w-lg text-sm leading-relaxed text-slate-600">
              Opens Gmail (or your mail app) with today&apos;s report pre-filled: what you got done, insights,
              work time, tomorrow. You review and hit Send — nothing leaves Daywinner automatically.
            </p>
            <Image
              src="/marketing/eod-send.jpg"
              alt="Send EOD to partner modal"
              width={1200}
              height={800}
              className="h-auto w-full"
              unoptimized
            />
          </article>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-slate-800"
          >
            {ctaLabel}
          </Link>
          <span className="text-sm text-slate-500">Same cockpit. Fewer excuses.</span>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h3 className="mb-5 max-w-2xl text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            If you try to escape to a distracting site, it blocks you &amp; counts it as an infraction. You are then
            able to see how many infractions you make per day.
          </h3>
          <div className="grid w-full items-center gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
            <div className="flex flex-col items-center text-center">
              <p className="mb-3 text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                You tried to distract yourself, but your bot got you
              </p>
              <Image
                src="/marketing/focus-session.jpg"
                alt="Focus session active — blocked site with countdown"
                width={1200}
                height={800}
                className="h-auto w-full"
                unoptimized
              />
            </div>

            <div className="flex justify-center py-2 sm:px-1" aria-hidden>
              <span className="rotate-90 text-5xl font-bold leading-none text-red-500 sm:rotate-0 sm:text-6xl">
                →
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <p className="mb-3 text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                Your infraction has been recorded
              </p>
              <Image
                src="/marketing/infraction-recorded.png"
                alt="Infraction recorded on the dashboard"
                width={793}
                height={511}
                className="h-auto w-full"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-16 border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Break Your Work Into Timed Work Sessions (Pomodoro or a Time of Your Choosing)
          </h2>
          <Image
            src="/marketing/floating-timer.jpg"
            alt="Floating timer for timed work sessions"
            width={1024}
            height={579}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Track Every Task by Time
          </h2>
          <Image
            src="/marketing/task-tracking.jpg"
            alt="Work today and time by project tracking"
            width={1024}
            height={220}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Block Your Most Distracting Sites
          </h2>
          <Image
            src="/marketing/blocked-sites.jpg"
            alt="Blocked sites list with social media pack"
            width={1024}
            height={745}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Create an Accountability Report That You Can Send to Either Yourself or a Partner
          </h2>
          <Image
            src="/marketing/eod-send.jpg"
            alt="Send EOD accountability report"
            width={1200}
            height={800}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Celebrate When You Finish a Project
          </h2>
          <Image
            src="/marketing/celebration.jpg"
            alt="Project completion celebration"
            width={1200}
            height={800}
            className="h-auto w-full"
            unoptimized
          />
        </div>
      </section>

      <section className="border-t border-slate-200 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-900 px-6 py-5 sm:px-10 sm:py-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                From the founder
              </p>
              <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl sm:leading-snug">
                Built by a guy with &ldquo;super ADHD&rdquo; for people who want to get more sh*t done
              </h2>
            </div>

            <div className="space-y-5 px-6 py-8 text-left text-[1.05rem] leading-[1.8] text-slate-700 sm:space-y-6 sm:px-10 sm:py-10 sm:text-lg sm:leading-[1.85]">
              <p>
                Hey, it&apos;s Grant. I&apos;m an idea guy / visionary (I hate using that term, but here it is) and I have
                what you&apos;d call &ldquo;super ADHD.&rdquo; My notes look schizophrenic, I have an idea list that never
                ends (that I genuinely believe I can do each one), and my brain goes 1 million mph.
              </p>
              <p>
                One day, I was trying to get work done &amp; then I opened Twitter to ragebait someone online. I then got
                &ldquo;sucked in&rdquo; and had spent an hour on the app. It was at that moment I realized &ldquo;oh,
                I&apos;m not above getting sucked into this.&rdquo; If it&apos;s there, we&apos;re going to use it. I then
                thought about how insane it was that the world&apos;s most addicting possible thing — the thing that smart
                people have quite literally spent billions engineering so it grips our attention/psyche (social media) —
                is on the <em>same device</em> (our laptop) that we&apos;re supposed to use to do our most important work
                on. Is that not{' '}
                <span className="font-bold text-slate-900">INSANE</span>?
              </p>
              <p>
                I then realized &ldquo;I have to get rid of this.&rdquo; So I did. And I built a social media blocker that
                is super easy to use. But I soon realized I wanted more. I wanted to break everything I had to do down to
                my most important tasks, and then I wanted to track that task and see exactly how long I worked on it. I
                was also astronomically lazy, so I also wanted a little personal robot to talk me through the organization
                process that I use to prepare my tasks, for me. I didn&apos;t want to think about it. I just wanted to
                click a button, and have my little robot help me get ready for the next day, organizing everything for me
                as I went.
              </p>
              <p>
                And that&apos;s what{' '}
                <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[0.95em] font-semibold text-white">
                  Daywinner bot
                </span>{' '}
                is. It&apos;s not just a tool — it&apos;s a{' '}
                <span className="font-bold text-slate-900">WAY TO WORK</span> that allows even the most
                distracted/ADHD type of person to <em>actually</em> lock in &amp; make more progress in the next 5 days
                than they have in the past 5 years. It&apos;s a tool I built for myself that I use daily, and finally, for
                the first time ever, I am making it publicly available for those who want to <em>actually</em> get sh*t
                done.
              </p>
              <p>
                Stop giving your attention to other people. Let Daywinner bot re-capture it for you, and direct it into
                the tasks that move your life forward.
              </p>
              <p className="pt-2 font-semibold text-slate-900">— Grant</p>
            </div>
          </div>
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
