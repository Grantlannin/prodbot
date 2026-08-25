import Link from 'next/link';
import type { ReactNode } from 'react';

interface MarketingShellProps {
  children: ReactNode;
  showSignIn?: boolean;
  /** Full-bleed label above the nav (challenge landing, etc.) */
  topBanner?: ReactNode;
  /** Wider main column (worksheet preview embeds, etc.) */
  wide?: boolean;
}

export default function MarketingShell({
  children,
  showSignIn = true,
  topBanner,
  wide = false,
}: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {topBanner ? <div className="w-full">{topBanner}</div> : null}
      <header
        className={`mx-auto flex w-full items-center justify-between px-6 py-4 ${wide ? 'max-w-4xl' : 'max-w-3xl'}`}
      >
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
      <main className={`mx-auto w-full px-6 pb-16 ${wide ? 'max-w-4xl' : 'max-w-3xl'}`}>{children}</main>
    </div>
  );
}
