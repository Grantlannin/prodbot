import { Suspense } from 'react';
import SubscribeSuccess from './SubscribeSuccess';

export default function SubscribeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
          Loading…
        </div>
      }
    >
      <SubscribeSuccess />
    </Suspense>
  );
}
