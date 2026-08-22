import type { Metadata } from 'next';
import Link from 'next/link';
import GsdWorksheet from '@/components/marketing/GsdWorksheet';

export const metadata: Metadata = {
  title: '7-Day Get Shit Done Challenge Worksheet | Daywinner bot',
  description:
    'Interactive daily checkbook: tee up your task, track 2 hours, add notes, make one uncertain decision, and log phone Screen Time — every day for 7 days.',
};

export default function WorksheetPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4 print:hidden">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900 no-underline">
          Daywinner bot
        </Link>
        <Link
          href="/app"
          className="text-sm font-semibold text-slate-600 no-underline transition hover:text-slate-900"
        >
          Open app
        </Link>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-2 sm:px-6">
        <GsdWorksheet />
      </main>
    </div>
  );
}
