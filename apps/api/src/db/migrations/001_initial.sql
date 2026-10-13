CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cooperatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coop_id UUID NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (coop_id, phone)
);

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coop_id UUID NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    account_type TEXT NOT NULL CHECK (account_type IN ('savings','pool')),
    UNIQUE (coop_id, member_id, account_type)
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coop_id UUID NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0)
);
