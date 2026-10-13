'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function ContributionForm({
  coopId,
  members,
}: {
  coopId: string;
  members: any[];
}) {
  const qc = useQueryClient();
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.recordContribution(coopId, {
        member_id: memberId,
        amount_kobo: Math.round(parseFloat(amount) * 100),
      }),
    onSuccess: () => {
      setAmount('');
      qc.invalidateQueries({ queryKey: ['summary', coopId] });
      qc.invalidateQueries({ queryKey: ['balance', coopId, memberId] });
      alert('Contribution recorded.');
    },
    onError: (err: any) => alert('Error: ' + err.message),
  });

  const disabled = !memberId || !amount || mutation.isPending;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="font-medium mb-4">Record a Contribution</h3>

      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Member</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="border rounded px-3 py-2 min-w-[220px]"
          >
            <option value="">Select member…</option>
            {members.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Amount (₦)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
            className="border rounded px-3 py-2 w-40"
          />
        </div>

        <button
          disabled={disabled}
          onClick={() => mutation.mutate()}
          className="bg-gray-900 text-white rounded px-5 py-2 hover:bg-gray-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Recording…' : 'Record'}
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Every contribution is a balanced double-entry transaction: debit pool,
        credit member savings. The database rejects anything that does not balance.
      </p>
    </div>
  );
}