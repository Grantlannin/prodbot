import Link from 'next/link';
import type { ReactNode } from 'react';

interface MarketingShellProps {
  children: ReactNode;
  showSignIn?: boolean;
}

export default function MarketingShell({ children, showSignIn = true }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900 no-underline">
          Daywinner bot
        </Link>
        {showSignIn ? (
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 no-underline transition hover:text-slate-900"
          >
            Sign in
          </Link>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 pb-16">{children}</main>
    </div>
  );
}
