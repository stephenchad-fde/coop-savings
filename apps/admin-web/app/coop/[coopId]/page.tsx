import { Suspense } from 'react';
import { CoopDashboard } from './dashboard';

export default function CoopPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <CoopDashboard />
    </Suspense>
  );
}