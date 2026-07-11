'use client';

import { useEffect, useState } from 'react';
import MarketingShell from '@/components/marketing/MarketingShell';

interface BillingStatus {
  active: boolean;
  billingEnabled: boolean;
}

export default function SubscribeSuccess() {
  const [message, setMessage] = useState('Confirming your subscription…');

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch('/api/billing/status');
        const data = (await res.json()) as BillingStatus;
        if (data.active) {
          window.location.href = '/app';
          return;
        }
      } catch {
        /* retry */
      }

      if (attempts >= maxAttempts) {
        setMessage('Almost there — refresh in a moment or contact support if this persists.');
        return;
      }

      setTimeout(poll, 1500);
    };

    void poll();
  }, []);

  return (
    <MarketingShell showSignIn={false}>
      <div className="flex justify-center pt-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-lg font-bold text-slate-900">Payment received</p>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </MarketingShell>
  );
}
