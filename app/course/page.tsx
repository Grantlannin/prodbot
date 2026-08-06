import { Suspense } from 'react';
import CoursePage from './CoursePage';

export default function CourseRoute() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-500">Loading…</div>
      }
    >
      <CoursePage />
    </Suspense>
  );
}
