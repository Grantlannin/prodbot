'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import { COURSE_PRICE_LABEL } from '@/lib/billing/price';
import {
  COURSE_SECTIONS,
  COURSE_TAGLINE,
  COURSE_TITLE,
  toYouTubeEmbedUrl,
  type CourseLesson,
  type CourseSection,
} from '@/lib/course/modules';
import { isBillingDemoFlow } from '@/lib/stripe/config';

interface BillingStatus {
  billingEnabled: boolean;
  active: boolean;
  courseAccess: boolean;
  checks?: { demoFlow?: boolean };
}

function LessonRow({
  lesson,
  index,
  open,
  onToggle,
}: {
  lesson: CourseLesson;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const embedUrl = toYouTubeEmbedUrl(lesson.videoUrl);

  return (
    <div className="border-t border-slate-100 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80"
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
            open ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 pt-0.5 text-sm font-semibold leading-snug text-slate-900">
          {lesson.title}
        </span>
        <span className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400">
          {open ? 'Hide' : 'Watch'}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 px-4 pb-4">
          {embedUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm">
              <div className="relative aspect-video w-full">
                <iframe
                  title={lesson.title}
                  src={embedUrl}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Couldn’t embed this video.</p>
          )}
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Open on YouTube ↗
          </a>
        </div>
      ) : null}
    </div>
  );
}

function SectionAccordion({
  section,
  sectionIndex,
  open,
  onToggle,
}: {
  section: CourseSection;
  sectionIndex: number;
  open: boolean;
  onToggle: () => void;
}) {
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setOpenLessonId(null);
  }, [open]);

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        open ? 'border-slate-300 shadow-md' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50/70"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
          {String(sectionIndex + 1).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Section {sectionIndex + 1} · {section.lessons.length} lessons
          </span>
          <span className="mt-1 block text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
            {section.title}
          </span>
          {section.subtitle ? (
            <span className="mt-1 block text-sm text-slate-500">{section.subtitle}</span>
          ) : null}
        </span>
        <span
          className={`mt-1 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
          {section.lessons.map((lesson, lessonIndex) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              open={openLessonId === lesson.id}
              onToggle={() =>
                setOpenLessonId(prev => (prev === lesson.id ? null : lesson.id))
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function CoursePage() {
  const searchParams = useSearchParams();
  const purchased = searchParams.get('purchased') === '1';

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSectionId, setOpenSectionId] = useState<string | null>(
    COURSE_SECTIONS[0]?.id ?? null
  );

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
        <div className="relative mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-8 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.08),_transparent_70%)]"
          />
          <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Daywinner · Course locked
            </p>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">{COURSE_TITLE}</h1>
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
      <div className="relative mx-auto max-w-2xl px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-6 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.07),_transparent_70%)]"
        />

        <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Daywinner · Member course
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{COURSE_TITLE}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{COURSE_TAGLINE}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">
                {COURSE_SECTIONS.length} sections · open a section, then tap a lesson to watch in-page
              </p>
            </div>
            <Link
              href="/app"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 no-underline shadow-sm transition hover:bg-white"
            >
              ← Back to bot
            </Link>
          </div>

          {purchased ? (
            <p className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              Course unlocked — same login as your bot.
            </p>
          ) : null}
        </div>

        <div className="relative flex flex-col gap-3">
          {COURSE_SECTIONS.map((section, sectionIndex) => (
            <SectionAccordion
              key={section.id}
              section={section}
              sectionIndex={sectionIndex}
              open={openSectionId === section.id}
              onToggle={() =>
                setOpenSectionId(prev => (prev === section.id ? null : section.id))
              }
            />
          ))}
        </div>
      </div>
    </MarketingShell>
  );
}
