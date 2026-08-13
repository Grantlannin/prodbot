import Link from 'next/link';
import Image from 'next/image';
import { isBillingDemoFlow, isBillingEnabled, isPaywallDisabled } from '@/lib/stripe/config';
import { MONTHLY_PRICE_SHORT, STARTER_PRICE_LABEL } from '@/lib/billing/price';
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
          <span className="text-sm font-medium text-slate-500 line-through">{MONTHLY_PRICE_SHORT}</span>
          <span className="text-sm font-semibold text-white">{STARTER_PRICE_LABEL}</span>
        </Link>
      )}
    </div>
  );
}

const whoItsFor = [
  {
    title: 'You’re ready to start making money online',
    body: 'No side hustle yet — that’s fine. You bought the bot to stop spinning and actually start. Pick the money work, lock in, and go.',
  },
  {
    title: 'You’re building something on your own',
    body: 'Indie app, micro-SaaS, newsletter, offer, solo product. You wear every hat. Daywinner keeps money work, timer, and blocklist in one spot so ship day doesn’t turn into scroll day.',
  },
  {
    title: 'You freelance for multiple clients',
    body: 'Designer, dev, writer, VA — juggling 2–5 clients. One place per client. Timed blocks. Notes on the paid work so switching doesn’t wreck your brain.',
  },
  {
    title: 'You make content that leads to sales',
    body: 'YouTube, TikTok, podcast, courses. Creating is half of it; offers, sponsors, and funnel work are the rest. Separate deep money work from busywork that doesn’t pay.',
  },
  {
    title: 'You have a day job and a side thing',
    body: 'Full-time plus consulting, content, Etsy, or whatever you’re building at night to make money online. An hour after work is gold — make it count on $ work only.',
  },
  {
    title: 'Your job is calls, emails, and outreach',
    body: 'Sales, recruiting, real estate, agency new business. Prospecting always gets pushed to “later.” Block morning time and work from a money list that’s actually yours.',
  },
  {
    title: 'You’re a consultant or coach',
    body: 'Strategy, career, fitness, business. Your calendar is full of calls; prep and follow-up (the work that gets you paid) get skipped. Block time for the money work between meetings.',
  },
  {
    title: 'You’re building an offer or product online',
    body: 'Landing page, course, SaaS, digital product. Endless “almost working on it.” One money task, timer on, sites locked — until the thing that makes you money actually ships.',
  },
  {
    title: 'You work in sprints but hate starting',
    body: 'You get paid work done — once you’re in. Starting and staying off your phone is the hard part. Simple setup: money projects, timer, site lock. No life to-do list.',
  },
  {
    title: 'You’re turning a skill into online income',
    body: 'Design, code, writing, editing — building clients, products, or content that pays. Protect the hours that move the bag, not the hours that feel busy.',
  },
];

const whoItsNotFor = [
  {
    title: 'Life admin & chores',
    body: 'Groceries, laundry, cleaning, errands, and “random life stuff.” Those don’t fall into the category of money-making work — and Daywinner isn’t built for them.',
  },
  {
    title: 'Catch-all to-do lists / life planning',
    body: 'If you want one app for everything in your day, this isn’t it. Daywinner is only for the work that makes you money online — including getting that work started.',
  },
  {
    title: 'Busywork that feels like progress',
    body: 'Reorganizing folders, tweaking logos for the 40th time, scrolling “research.” If it doesn’t move revenue or your $ goal, it doesn’t belong in Daywinner — on purpose.',
  },
  {
    title: 'Another planner to bookmark and ignore',
    body: 'Daywinner isn’t a shelf app you collect and forget. It’s a lock-in bot for money tasks you actually run — whether you’re starting or already grinding.',
  },
  {
    title: 'Hobby / personal projects (unless they pay)',
    body: 'Hobbies, random to-do’s and personal stuff stay out — unless it’s clearly tied to online income or a real $ goal.',
  },
  {
    title: 'Team / company project management',
    body: 'Not Asana for your company. Daywinner is a personal bot for money-making work when you’re the one who has to do it.',
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
            alt="Daywinner bot presenting the money-work dashboard"
            width={1400}
            height={934}
            className="mb-5 h-auto w-full max-w-[400px] sm:max-w-[520px]"
            unoptimized
            priority
          />
          <p className="max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-relaxed">
            Daywinner bot is your personal &ldquo;lock in&rdquo; dashboard + robot that helps you{' '}
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
              hit your $$ goals
            </span>{' '}
            by blocking social media access on your desktop + helping you prioritize/prep your #1 most important task
            daily (exactly like 7-figure entrepreneurs do). THEY waste time on busywork/scrolling,{' '}
            <span className="font-semibold text-slate-900">YOU</span> get ahead. It&apos;s time to get sh*t done.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2">
            {useCheckout ? (
              <StartCheckoutButton showPrice className={ctaBtnClass}>
                i&apos;m ready to f****** print
              </StartCheckoutButton>
            ) : (
              <Link href={fallbackHref} className={ctaBtnClass}>
                <span className="text-sm font-semibold text-white">i&apos;m ready to f****** print</span>
                <span className="text-sm font-medium text-slate-500 line-through">{MONTHLY_PRICE_SHORT}</span>
                <span className="text-sm font-semibold text-white">{STARTER_PRICE_LABEL}</span>
              </Link>
            )}
            <p className="text-xs text-slate-500 sm:text-sm">
              {STARTER_PRICE_LABEL} today. Then {MONTHLY_PRICE_SHORT} after 7 days. Cancel anytime.
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
              Set Up Your #1 &ldquo;Money Task&rdquo;.
              <br />
              <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
                LOCK IN.
              </span>{' '}
              (literally)
            </h2>
            <Image
              src="/marketing/sessions-flow-steps.png"
              alt="Step 1 Choose the task that makes you money > Step 2 set your work timer > Step 3 Begin working (with social media blocked)"
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
              aria-label="Daywinner dashboard with sessions tracked by money task"
            />
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
              Every money task is linked to your tracker &amp; timer. This shows you exactly what you worked on &amp; for
              how long, so you can&apos;t lie to yourself. It also FORCES you to stay organized - because if you
              don&apos;t organize, you can&apos;t start the session.
            </p>
            <SectionCta checkout={useCheckout} href={fallbackHref} label="i'm ready to LITERALLY lock in" />
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
            Step 1: Organize your most important money-making tasks into 1 place (which links them all to your tracker)
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            With Daywinner bot, you can now store relevant links + notes in SPECIFIC tasks, instead of losing them all
            over your computer &amp; destroying your flow.
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
            Step 2: Choose the most important &ldquo;money task&rdquo; that will actually lead to you making more $$.
          </h2>
          <Image
            src="/marketing/choose-task.jpg"
            alt="What are you working on — choose a money task"
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
            25 mins for Pomodoro. 45 mins if you&apos;re a psycho. 60+ mins if you want to print ASAP. And yes, your bot
            automatically links your timed worked session to the specific task you&apos;re doing.
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
            Step 4: Choose the strength of your distraction blocker. Soft lock, or hard lock?
          </h2>
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-slate-600">
            Your bot blocks social media until your work timer hits zero. Soft lock = 2 minute annoying wait if you bail
            early (you&apos;ll usually just go back to work). Hard lock = locked in until full session ends, for when
            you gotta force yourself to finish.
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
            Step 5: Put in an AMAZING tracked work session (on your most important task) &amp; get used to your new
            powers
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
            Congrats. You just had a more productive 4 hours than you&apos;ve had in the past 4 years. But now,
            it&apos;s time for the real magic...
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
            alt="Wind down bot asking what money work you got done today"
            width={942}
            height={1024}
            className="mb-6 h-auto w-full max-w-md sm:max-w-lg"
            unoptimized
          />
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
            There is nowhere to hide. Your bot will ask you what you got done, and you are able to see if it was
            *actually* the highest-leverage $ task you had available, or if you just &ldquo;productively
            procrastinated&rdquo;.
          </p>
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Your bot then puts you through a wind-down flow that forces you to stay organized &amp; prioritize the 1
            most important task for tomorrow (and it walks you through the whole thing, zero effort on your end)
          </h2>
          <Image
            src="/marketing/wind-down-context.jpg"
            alt="Wind down flow adding context and organizing tomorrow's money task"
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
            The single most important task you need to do next, already ready to go.
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
                  alt="Tomorrow's money task — already teed up"
                  width={460}
                  height={200}
                  className="h-auto w-[58%] max-w-[200px] rounded-lg bg-white"
                  unoptimized
                />
              </div>
            </div>
          </div>
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Boom - you&apos;ve just organized your dashboard &amp; &ldquo;tee&apos;d up&rdquo; tomorrow&apos;s most
            important task like a 7-figure entrepreneur. Pair that with your social media blocker &amp; timer, and
            you&apos;re about to{' '}
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
              WIN THE DAY
            </span>{' '}
            &amp; make some f****** money. It&apos;s been won before it even started.
          </p>
          <SectionCta checkout={useCheckout} href={fallbackHref} label="Let's run this. I'm THIRSTY for my cash daddy" />
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
            trouble picking what actually moves the bag? The bot has a flow for that
          </h2>
          <Image
            src="/marketing/organize-start.jpg"
            alt="Stuck help options — trouble organizing money task list"
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
            alt="Bot teeing up the most important money task"
            width={1024}
            height={898}
            className="h-auto w-full border-4 border-red-500"
            unoptimized
          />
          <SectionCta checkout={useCheckout} href={fallbackHref} label="Need my bot ASAP" />
        </div>
      </section>

      <section className="border-t border-slate-200 py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
          <p className="mb-4 text-center text-2xl font-bold tracking-tight text-red-500 sm:text-4xl">
            Look, here&apos;s the problem. Can I just vent for a sec?
          </p>
          <h2 className="mb-8 max-w-3xl text-center text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Social media, distractions &amp; busywork are taking your best money-making hours from you. And the work that
            *actually* moves your bag forward is getting eaten away at, 10 minute chunk by 10 minute chunk...
          </h2>
          <div className="mb-8 w-full max-w-2xl space-y-5 text-left text-base leading-relaxed text-slate-600 sm:text-lg">
            <p>
              I mean seriously. You want to make way more money, but your attention is getting destroyed by social media
              &amp; a bunch of other random websites that aren&apos;t the task you&apos;re supposed to be doing. This
              causes your progress to feel slow af, and it makes your self worth drop because you know you could be a
              beast if you figured out how to actually lock in, but for some reason, the output isn&apos;t matching what
              you know you can do. I&apos;ve been there, because I was you.
            </p>
            <p className="font-semibold text-slate-900">The issue is 2-fold:</p>
            <div className="space-y-3">
              <p>
                <span className="font-bold text-slate-900">#1</span> - your sh*t is probably laying everywhere. Some work
                stuff in your notes tab, some in your docs, some in your phone. It&apos;s probably random as hell.
                Daywinner allows you to put everything that&apos;s relevant to the most important work that will actually
                make you money into 1 specific place - and then allows you to track all of it while you do that same
                *actually* important work. Nothing else goes into it. It has 1 function - to help you WIN THE DAY by
                completing your #1 most important task daily, every single day.
              </p>
              <p>
                <span className="font-bold text-slate-900">#2</span> - little social media checks are destroying your
                productivity/workflow. This was happening to me. 1 little phone check, 10 minutes gone. Another one, 30
                minutes gone. Another one, now I don&apos;t feel like working. Then 3 weeks passes by, i&apos;ve done
                literally f****** nothing. &ldquo;Wow, i&apos;m better than this. this is disgusting&rdquo;. That
                embarrassment for my lack of focus is what drove me to create daywinner bot. I wanted all my stuff in 1
                place, and i wanted to be able to block every social media site &amp; give me a simple work timer that I
                could see in a browser tab that then showed me exactly what I worked on so I had *actual proof* of what I
                did that day so I couldn&apos;t lie to myself. And that&apos;s exactly what daywinner bot is. Since using
                it, I&apos;ve legitimately been 20x+ more productive and i&apos;m not even joking. I use it every day, and
                i make progress EVERY single day. I quite literally haven&apos;t &ldquo;missed&rdquo; a work day yet with
                it in my possession. Once you get familiar with it &amp; *actually* use it, your work &ldquo;hit
                rate&rdquo; goes to 100%. You simply stop missing. Then at that point, the only variable left is
                &ldquo;are you doing the right task or not&rdquo;, and there&apos;s a course paired with the bot that
                helps you make sure that you are. A TOTAL no-brainer for the price. If $4.99 isn&apos;t worth
                re-claiming like 100+ hours per month of deep focused work for you, i don&apos;t know what to tell you
                lol. Just try it out &amp; see for yourself.
              </p>
            </div>
          </div>
          <SectionCta checkout={useCheckout} href={fallbackHref} label="I'm ready to use my hours on ME" />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-12 sm:pt-16">
        <div className="mb-10 flex flex-col items-center text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Who this is for</p>
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Daywinner bot is for people who are either trying to make $$$ online or are already making it (and want to
            make more).
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Daywinner isn&apos;t a life planner. It&apos;s a homebase for the work that gets you printing. If you&apos;re
            doing (or need to do) work that makes you internet cash, Daywinner can help you run laps around your old self.
            Just prioritize your #1 most important task. Lock in. Block everything that isn&apos;t the task. And Go.
          </p>
        </div>

        <ul className="mb-14 grid gap-4 sm:grid-cols-2">
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

        <div className="mb-10 flex flex-col items-center text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-500">
            Daywinner is not for
          </p>
          <h2 className="mb-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            If the task ain&apos;t talking cashflow, Daywinner bot say NO NO.
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Daywinner is specifically designed for pushing your most baller money-making tasks forward — not worrying
            about your grocery list. This is very honestly what Daywinner is not for:
          </p>
        </div>

        <ul className="mb-10 grid gap-4 sm:grid-cols-2">
          {whoItsNotFor.map(item => (
            <li
              key={item.title}
              className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-sm"
            >
              <h3 className="mb-2 text-sm font-bold leading-snug text-slate-900">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
            </li>
          ))}
        </ul>

        <p className="mx-auto mb-8 max-w-lg text-center text-base leading-relaxed text-slate-600">
          Whether you&apos;re already making money online or you&apos;re choosing the bot to finally start —
          Daywinner gives you structure to do the work that pays, without turning into a life to-do list.
        </p>

        <div className="flex flex-col items-center">
          <SectionCta checkout={useCheckout} href={fallbackHref} label="THOSE SOUND BORING ANYWAY. IT'S PRINT TIME." />
        </div>
      </section>

      <section className="space-y-6 border-t border-slate-200 pt-12 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Need additional accountability?
          </h2>
          <p className="mb-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            You can turn every money task you worked on into an EOD report &amp; send it to an accountability buddy
            (or yourself) easily via email with 1 click so they can see the{' '}
            <span className="underline decoration-[2px] underline-offset-2">truth</span> of your money hours.
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
            Opens Gmail (or your mail app) with today&apos;s report pre-filled: what money work you got done,
            insights, work time, tomorrow. You review and hit Send — nothing leaves Daywinner automatically.
          </p>
          <SectionCta checkout={useCheckout} href={fallbackHref} label="GIVE ME MY BOT" />
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
