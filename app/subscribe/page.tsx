import { Suspense } from 'react';
import SubscribeForm from './SubscribeForm';

export default function SubscribePage() {
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
      <SubscribeForm />
    </Suspense>
  );
}
