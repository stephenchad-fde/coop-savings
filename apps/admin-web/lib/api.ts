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
  recordContribution: (
    coopId: string,
    body: { member_id: string; amount_kobo: number },
  ) =>
    request<any>(`/coops/${coopId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listLoans: (coopId: string, status?: string) =>
    request<any[]>(
      `/coops/${coopId}/loans${status ? `?status=${status}` : ''}`,
    ),
  applyForLoan: (
    coopId: string,
    body: {
      member_id: string;
      principal_kobo: number;
      interest_rate: number;
      term_months: number;
    },
  ) =>
    request<any>(`/coops/${coopId}/loans`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  approveLoan: (coopId: string, loanId: string) =>
    request<any>(`/coops/${coopId}/loans/${loanId}/approve`, { method: 'POST' }),
  rejectLoan: (coopId: string, loanId: string, reason: string) =>
    request<any>(`/coops/${coopId}/loans/${loanId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  disburseLoan: (coopId: string, loanId: string) =>
    request<any>(`/coops/${coopId}/loans/${loanId}/disburse`, { method: 'POST' }),
   
  repayLoan: (
    coopId: string,
    body: { member_id: string; amount_kobo: number },
  ) =>
    request<any>(`/coops/${coopId}/loans/repay`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),


};