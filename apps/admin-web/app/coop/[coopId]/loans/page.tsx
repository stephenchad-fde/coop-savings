import { Suspense } from 'react';
import { LoansView } from './loans-view';

export default function LoansPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <LoansView />
    </Suspense>
  );
}