'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtNaira } from '@/lib/format';
import { useParams } from 'next/navigation';
import { useState } from 'react';

const TABS = ['pending', 'approved', 'disbursed', 'repaid', 'rejected'] as const;
type Tab = (typeof TABS)[number];

export function LoansView() {
  const params = useParams<{ coopId: string }>();
  const coopId = params.coopId;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('pending');

  const { data: loans } = useQuery({
    queryKey: ['loans', coopId, tab],
    queryFn: () => api.listLoans(coopId, tab),
    enabled: !!coopId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['loans', coopId] });
    qc.invalidateQueries({ queryKey: ['summary', coopId] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => api.approveLoan(coopId, id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.rejectLoan(coopId, id, reason),
    onSuccess: invalidate,
  });

  const disburse = useMutation({
    mutationFn: (id: string) => api.disburseLoan(coopId, id),
    onSuccess: invalidate,
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Loans</h1>

      <div className="flex gap-1 bg-white p-1 rounded-lg shadow w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm capitalize whitespace-nowrap transition ${
              tab === t
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!loans ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : loans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {tab} loans.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Member</th>
                  <th className="text-right px-6 py-3 font-medium">Principal</th>
                  <th className="text-right px-6 py-3 font-medium">Interest</th>
                  <th className="text-right px-6 py-3 font-medium">Term</th>
                  <th className="text-right px-6 py-3 font-medium">Applied</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l: any) => (
                  <tr key={l.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {l.member_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {l.member_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium">
                      {fmtNaira(l.principal_kobo)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {(Number(l.interest_rate) * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {l.term_months} mo
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {new Date(l.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <LoanActions
                          loan={l}
                          onApprove={() => approve.mutate(l.id)}
                          onReject={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason) reject.mutate({ id: l.id, reason });
                          }}
                          onDisburse={() => disburse.mutate(l.id)}
                          approvePending={approve.isPending}
                          rejectPending={reject.isPending}
                          disbursePending={disburse.isPending}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {loans.map((l: any) => (
                <div key={l.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{l.member_name}</div>
                      <div className="text-xs text-gray-500">
                        {l.member_phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {fmtNaira(l.principal_kobo)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {l.term_months} mo · {(Number(l.interest_rate) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <LoanActions
                      loan={l}
                      onApprove={() => approve.mutate(l.id)}
                      onReject={() => {
                        const reason = prompt('Rejection reason:');
                        if (reason) reject.mutate({ id: l.id, reason });
                      }}
                      onDisburse={() => disburse.mutate(l.id)}
                      approvePending={approve.isPending}
                      rejectPending={reject.isPending}
                      disbursePending={disburse.isPending}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoanActions({
  loan,
  onApprove,
  onReject,
  onDisburse,
  approvePending,
  rejectPending,
  disbursePending,
}: {
  loan: any;
  onApprove: () => void;
  onReject: () => void;
  onDisburse: () => void;
  approvePending: boolean;
  rejectPending: boolean;
  disbursePending: boolean;
}) {
  if (loan.status === 'pending') {
    return (
      <>
        <button
          onClick={onApprove}
          disabled={approvePending}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {approvePending ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={onReject}
          disabled={rejectPending}
          className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rejectPending ? 'Rejecting…' : 'Reject'}
        </button>
      </>
    );
  }

  if (loan.status === 'approved') {
    return (
      <button
        onClick={onDisburse}
        disabled={disbursePending}
        className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disbursePending ? 'Disbursing…' : 'Disburse'}
      </button>
    );
  }

  return <span className="text-xs text-gray-400">—</span>;
}