import { Suspense } from 'react';
import { getCheckoutEmailForPrefill } from '@/lib/billing/checkout-prefill';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { session_id?: string };
}) {
  const prefillEmail = await getCheckoutEmailForPrefill(searchParams?.session_id);

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f1f5f9',
            color: '#64748b',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          Loading…
        </div>
      }
    >
      <LoginForm prefillEmail={prefillEmail} />
    </Suspense>
  );
}
