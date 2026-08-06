'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import { COURSE_PRICE_LABEL } from '@/lib/billing/price';
import {
  COURSE_SECTIONS,
  COURSE_TAGLINE,
  COURSE_TAGLINE_BEFORE,
  COURSE_TAGLINE_EMPHASIS,
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
    <div className="border-t border-slate-200 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${
          open ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
        }`}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
            open ? 'bg-blue-500 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {index + 1}
        </span>
        <span
          className={`min-w-0 flex-1 pt-0.5 text-sm font-bold leading-snug tracking-tight ${
            open ? 'text-white' : 'text-slate-900'
          }`}
        >
          {lesson.title}
        </span>
        <span
          className={`mt-0.5 shrink-0 text-xs font-bold uppercase tracking-wide ${
            open ? 'text-blue-300' : 'text-blue-500'
          }`}
        >
          {open ? 'Hide' : 'Watch'}
        </span>
      </button>

      {open ? (
        <div className="bg-slate-950 px-4 pb-4 pt-3">
          {embedUrl ? (
            <div className="overflow-hidden rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#3b82f6]">
              <div className="relative aspect-video w-full bg-black">
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
            <p className="text-sm text-slate-300">Couldn’t embed this video.</p>
          )}
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
      className={`overflow-hidden rounded-2xl border-[3px] border-slate-900 bg-white transition ${
        open ? 'shadow-[6px_6px_0_0_#3b82f6]' : 'shadow-[3px_3px_0_0_#cbd5e1]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
          {String(sectionIndex + 1).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-blue-500">
            Section {sectionIndex + 1} · {section.lessons.length} lessons
          </span>
          <span className="mt-1 block text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
            {section.title}
          </span>
          {section.subtitle ? (
            <span className="mt-1 block text-sm font-medium text-slate-500">{section.subtitle}</span>
          ) : null}
        </span>
        <span
          className={`mt-1 shrink-0 text-xl font-bold leading-none text-blue-500 transition ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ↓
        </span>
      </button>

      {open ? (
        <div className="border-t-[3px] border-slate-900 bg-white">
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
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
          <div className="rounded-2xl border-[3px] border-slate-900 bg-white p-8 shadow-[6px_6px_0_0_#3b82f6]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500">
              Daywinner · Course locked
            </p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">{COURSE_TITLE}</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              {COURSE_TAGLINE_BEFORE}
              <em>{COURSE_TAGLINE_EMPHASIS}</em>.
            </p>

            {demoHint ? (
              <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                Demo mode — unlock is free (no charge)
              </p>
            ) : null}

            {error ? (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={buyCourse}
              disabled={busy}
              className="w-full rounded-full bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy
                ? 'Working…'
                : demoHint
                  ? 'Unlock course (demo) →'
                  : `Unlock course — ${COURSE_PRICE_LABEL}`}
            </button>

            <Link
              href="/app"
              className="mt-4 block text-center text-sm font-bold text-slate-500 no-underline hover:text-slate-900"
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
        <div className="mb-8 overflow-hidden rounded-2xl border-[3px] border-slate-900 bg-white p-6 shadow-[6px_6px_0_0_#3b82f6] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500">
                Daywinner · Member course
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {COURSE_TITLE}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                {COURSE_TAGLINE_BEFORE}
                <em>{COURSE_TAGLINE_EMPHASIS}</em>.
              </p>
              <p className="mt-4">
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {COURSE_SECTIONS.length} sections
                </span>
                <span className="ml-2 text-xs font-medium text-slate-500">
                  Open a section, then tap Watch
                </span>
              </p>
            </div>
            <Link
              href="/app"
              className="rounded-full border-[2px] border-slate-900 bg-white px-4 py-2 text-sm font-bold text-slate-900 no-underline shadow-[3px_3px_0_0_#3b82f6] transition hover:bg-slate-50"
            >
              ← Back to bot
            </Link>
          </div>

          {purchased ? (
            <p className="mt-5 rounded-md border-2 border-green-600 bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
              Course unlocked — same login as your bot.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
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
