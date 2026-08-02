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
      <section className="pt-8 sm:pt-14">
        <div className="flex flex-col items-center text-center">
          <h1 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Fighter Pilots Have Their Cockpit. You Have Your Daywinner Bot.
          </h1>
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
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Every Work Session Easily Tracked. Every Task Organized Effortlessly.
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            Every session is tracked by task, which not only shows you exactly what you worked on &amp; for how long —
            but also forces you to stay organized. Because if you don&apos;t organize, you can&apos;t start the
            session.
          </p>
          <video
            className="h-auto w-full"
            src="/marketing/sessions-tracked.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            aria-label="Daywinner dashboard with sessions tracked by task"
          />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <p className="mb-2 text-sm font-medium text-slate-500 sm:text-base">
            The 1 golden question:
          </p>
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
            There is nowhere to hide. Your daywinner bot will ask you one simple question daily:
          </p>
          <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-slate-900">
            &ldquo;what did you objectively get done today?&rdquo;.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            No more wasting time doing nothing, or doing the wrong stuff.
          </p>
        </div>
      </section>

      <section className="space-y-6 border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Step 1: Organize your most important tasks (which links them to your tracker)
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
            Step 2: Choose which task you want to work on
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
            Step 3: Pick a work session length (25 mins for pomodoro, 60 mins etc) &amp; choose your lock strength
            (which blocks your most distracting sites)
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            Soft lock allows you to exit the lock after waiting for 2 minutes, hard lock makes it so you can&apos;t
            escape, and all you can do is work.
          </p>
          <Image
            src="/marketing/focus-session-setup.jpg"
            alt="Focus session length and lock strength options"
            width={1024}
            height={724}
            className="mb-10 h-auto w-full"
            unoptimized
          />
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
        <div className="mb-10">
          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            A work dashboard for all of your most important, ball-moving projects. Break every project down into
            tasks &amp; subtasks, each with their own independent storage containers + notes sections so you never
            lose context (and pay the clarity tax)
          </h2>
          <Image
            src="/marketing/projects.jpg"
            alt="Projects dashboard with tasks and subtasks"
            width={1024}
            height={443}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="mb-10 border-t border-slate-200 pt-8">
          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            store your ai/doc links into individual tasks so you never lose them again.
          </h2>
          <Image
            src="/marketing/context-links.jpg"
            alt="Context links modal for storing AI and doc links on a task"
            width={1024}
            height={444}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="mb-10 border-t border-slate-200 pt-8">
          <h2 className="mb-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            Easy-to-view timer + blocks all distracting sites effortlessly
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            Floating timer lets you run pomodoro sessions (or timed work sessions of the length of your choosing)
            while always allowing you to see exactly how much time is left
          </p>
          <Image
            src="/marketing/floating-timer.jpg"
            alt="Floating timer over a Google Doc with live countdown"
            width={1024}
            height={579}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="mb-10 border-t border-slate-200 pt-8">
          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            each task is tracked individually (along with your total work time), and you cannot begin a work session
            unless there is a task attached (forcing you to stay organized):
          </h2>
          <Image
            src="/marketing/task-tracking.jpg"
            alt="Work today timer and time by project breakdown"
            width={1024}
            height={220}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="mb-10 border-t border-slate-200 pt-8">
          <h2 className="mb-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            custom note ui allows you to bring your notes on any tab and save specific chunks to specific tasks,
            effortlessly.
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            Even allowing you to add additional context so you don&apos;t forget why you put the note there.
          </p>
          <Image
            src="/marketing/custom-notes.jpg"
            alt="Custom notes UI saving a chunk to a specific task with context"
            width={1024}
            height={596}
            className="h-auto w-full"
            unoptimized
          />
        </div>

        <div className="mb-10 border-t border-slate-200 pt-8">
          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
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

          <div className="flex justify-center py-6" aria-hidden>
            <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
          </div>

          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
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

        <div className="mb-10 border-t border-slate-200 pt-8">
          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
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

          <div className="flex justify-center py-6" aria-hidden>
            <span className="text-6xl font-bold leading-none text-red-500 sm:text-7xl">↓</span>
          </div>

          <h2 className="mb-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
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
