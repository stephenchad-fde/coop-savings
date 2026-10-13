-- Allow 'loan' as an account type
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('savings','pool','loan'));

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coop_id UUID NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id),
    principal_kobo BIGINT NOT NULL CHECK (principal_kobo > 0),
    interest_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    term_months INT NOT NULL CHECK (term_months > 0),
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','approved','rejected','disbursed','repaid','defaulted')),
    reason TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    disbursed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_loans_coop_status ON loans (coop_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_member ON loans (member_id);