'use client';



import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  const { data: coops, isLoading } = useQuery({
    queryKey: ['coops'],
    queryFn: api.listCoops,
  });

  useEffect(() => {
    if (coops && coops.length === 1) {
      router.replace(`/coop/${coops[0].id}`);
    }
  }, [coops, router]);

  if (isLoading) return <div className="p-8">Loading…</div>;

  if (!coops || coops.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Coop Savings</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p>No cooperatives yet.</p>
          <p className="text-sm text-gray-600 mt-2">
            Create one via <code className="bg-gray-100 px-1">curl</code> or the API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Cooperatives</h1>
      <div className="space-y-3">
        {coops.map((c: any) => (
          <Link
            key={c.id}
            href={`/coop/${c.id}`}
            className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition"
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-gray-500 mt-1">{c.id}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}