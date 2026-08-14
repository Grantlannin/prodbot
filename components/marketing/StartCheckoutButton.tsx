'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { MONTHLY_PRICE_SHORT } from '@/lib/billing/price';

interface StartCheckoutButtonProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Show struck $12.99 + current monthly price like landing CTAs */
  showPrice?: boolean;
}

export default function StartCheckoutButton({
  children,
  className,
  style,
  showPrice = false,
}: StartCheckoutButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not start checkout.');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={busy}
        className={className}
        style={{ cursor: busy ? 'wait' : 'pointer', ...style }}
      >
        {busy ? (
          <span className="text-sm font-semibold text-white">it&apos;s time to win...</span>
        ) : showPrice ? (
          <>
            <span className="text-sm font-semibold text-white">{children}</span>
            <span className="text-sm font-medium text-slate-500 line-through">$12.99/mo</span>
            <span className="text-sm font-semibold text-white">{MONTHLY_PRICE_SHORT}</span>
          </>
        ) : (
          children
        )}
      </button>
      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
