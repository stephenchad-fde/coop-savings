'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtNaira } from '@/lib/format';
import { useParams } from 'next/navigation';

import { ContributionForm } from './contribution-form';

export function CoopDashboard() {
  const params = useParams<{ coopId: string }>();
  const coopId = params.coopId;

  const { data: summary } = useQuery({
    queryKey: ['summary', coopId],
    queryFn: () => api.getSummary(coopId),
    enabled: !!coopId,
  });

  const { data: members } = useQuery({
    queryKey: ['members', coopId],
    queryFn: () => api.listMembers(coopId),
    enabled: !!coopId,
  });

  if (!summary || !members) return <div className="p-8">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Coop Savings</h1>
      <ContributionForm coopId={coopId} members={members} />

      <div className="grid grid-cols-3 gap-4">
        <Metric label="Members" value={String(summary.member_count)} />
        <Metric
          label="Total Savings"
          value={fmtNaira(summary.total_savings_kobo)}
          accent="green"
        />
        <Metric label="Pool Balance" value={fmtNaira(summary.pool_balance_kobo)} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium">Members</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left px-6 py-3">Name</th>
              <th className="text-left px-6 py-3">Phone</th>
              <th className="text-left px-6 py-3">Joined</th>
              <th className="text-right px-6 py-3">Savings</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: any) => (
              <MemberRow key={m.id} coopId={coopId} member={m} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'green';
}) {
  const color = accent === 'green' ? 'text-green-700' : 'text-gray-900';
  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <div className="text-xs uppercase text-gray-500 tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${color}`}>{value}</div>
    </div>
  );
}

function MemberRow({ coopId, member }: { coopId: string; member: any }) {
  const { data: balance } = useQuery({
    queryKey: ['balance', coopId, member.id],
    queryFn: () => api.getMemberBalance(coopId, member.id),
  });

  const savings = balance?.savings ?? 0;

  return (
    <tr className="border-t">
      <td className="px-6 py-3 text-sm">{member.full_name}</td>
      <td className="px-6 py-3 text-sm text-gray-600">{member.phone}</td>
      <td className="px-6 py-3 text-sm text-gray-600">
        {new Date(member.joined_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-3 text-sm text-right font-medium text-green-700">
        {balance ? fmtNaira(savings) : '—'}
      </td>
    </tr>
  );
}