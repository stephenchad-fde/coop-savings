const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  listCoops: () => request<any[]>('/coops'),
  getSummary: (coopId: string) => request<any>(`/coops/${coopId}/summary`),
  listMembers: (coopId: string) => request<any[]>(`/coops/${coopId}/members`),
  getMemberBalance: (coopId: string, memberId: string) =>
    request<any>(`/coops/${coopId}/members/${memberId}/balance`),
};