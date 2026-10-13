import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DbService } from '../db/db.service';

@Injectable()
export class LedgerService {
  constructor(private db: DbService) {}

  private async getAccountId(
    client: PoolClient,
    coopId: string,
    memberId: string | null,
    accountType: string,
  ): Promise<string> {
    const { rows } = await client.query(
      `SELECT id FROM accounts
       WHERE coop_id = $1
         AND (member_id = $2 OR (member_id IS NULL AND $2 IS NULL))
         AND account_type = $3`,
      [coopId, memberId, accountType],
    );
    if (!rows[0]) {
      throw new NotFoundException(
        `Account not found: member=${memberId} type=${accountType}`,
      );
    }
    return rows[0].id;
  }

  async recordContribution(params: {
    coopId: string;
    memberId: string;
    amountKobo: number;
  }) {
    if (params.amountKobo <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.db.withTransaction(async (client) => {
      const poolAccount = await this.getAccountId(client, params.coopId, null, 'pool');
      const savingsAccount = await this.getAccountId(
        client,
        params.coopId,
        params.memberId,
        'savings',
      );

      const { rows } = await client.query(
        `INSERT INTO transactions (coop_id, description)
         VALUES ($1, $2) RETURNING *`,
        [params.coopId, `Contribution from member ${params.memberId}`],
      );
      const txn = rows[0];

      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, direction, amount_kobo)
         VALUES ($1, $2, 'debit', $3), ($1, $4, 'credit', $3)`,
        [txn.id, poolAccount, params.amountKobo, savingsAccount],
      );

      return txn;
    });
  }


  async applyForLoan(params: {
    coopId: string;
    memberId: string;
    principalKobo: number;
    interestRate: number;
    termMonths: number;
  }) {
    if (params.principalKobo <= 0) {
      throw new BadRequestException('Principal must be positive');
    }
    const { rows } = await this.db.query(
      `INSERT INTO loans (coop_id, member_id, principal_kobo, interest_rate, term_months, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [
        params.coopId,
        params.memberId,
        params.principalKobo,
        params.interestRate,
        params.termMonths,
      ],
    );
    return rows[0];
  }

  async approveLoan(coopId: string, loanId: string) {
    const { rows } = await this.db.query(
      `UPDATE loans
       SET status = 'approved', decided_at = NOW()
       WHERE id = $1 AND coop_id = $2 AND status = 'pending'
       RETURNING *`,
      [loanId, coopId],
    );
    if (!rows[0]) throw new NotFoundException('Pending loan not found');
    return rows[0];
  }

  async rejectLoan(coopId: string, loanId: string, reason: string) {
    const { rows } = await this.db.query(
      `UPDATE loans
       SET status = 'rejected', decided_at = NOW(), reason = $3
       WHERE id = $1 AND coop_id = $2 AND status = 'pending'
       RETURNING *`,
      [loanId, coopId, reason],
    );
    if (!rows[0]) throw new NotFoundException('Pending loan not found');
    return rows[0];
  }

  async disburseLoan(coopId: string, loanId: string) {
    return this.db.withTransaction(async (client) => {
      const { rows: loanRows } = await client.query(
        `SELECT * FROM loans WHERE id = $1 AND coop_id = $2 AND status = 'approved'`,
        [loanId, coopId],
      );
      const loan = loanRows[0];
      if (!loan) throw new NotFoundException('Approved loan not found');

      const poolAccount = await this.getAccountId(client, coopId, null, 'pool');

      // Create or reuse a loan account for the member
      let loanAccount: string;
      const existing = await client.query(
        `SELECT id FROM accounts WHERE coop_id = $1 AND member_id = $2 AND account_type = 'loan'`,
        [coopId, loan.member_id],
      );
      if (existing.rows[0]) {
        loanAccount = existing.rows[0].id;
      } else {
        const { rows } = await client.query(
          `INSERT INTO accounts (coop_id, member_id, account_type)
           VALUES ($1, $2, 'loan') RETURNING id`,
          [coopId, loan.member_id],
        );
        loanAccount = rows[0].id;
      }

      const { rows: txnRows } = await client.query(
        `INSERT INTO transactions (coop_id, description)
         VALUES ($1, $2) RETURNING *`,
        [coopId, `Loan disbursement ${loan.id}`],
      );
      const txn = txnRows[0];

      // Debit loan account (member owes), credit pool (cash out)
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, direction, amount_kobo)
         VALUES ($1, $2, 'debit', $3), ($1, $4, 'credit', $3)`,
        [txn.id, loanAccount, loan.principal_kobo, poolAccount],
      );

      await client.query(
        `UPDATE loans SET status = 'disbursed', disbursed_at = NOW() WHERE id = $1`,
        [loanId],
      );

      return { ...loan, status: 'disbursed' };
    });
  }

  async repayLoan(params: {
    coopId: string;
    memberId: string;
    amountKobo: number;
  }) {
    if (params.amountKobo <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.db.withTransaction(async (client) => {
      const poolAccount = await this.getAccountId(client, params.coopId, null, 'pool');
      const loanAccount = await this.getAccountId(
        client,
        params.coopId,
        params.memberId,
        'loan',
      );

      const { rows: txnRows } = await client.query(
        `INSERT INTO transactions (coop_id, description)
         VALUES ($1, $2) RETURNING *`,
        [params.coopId, `Loan repayment from member ${params.memberId}`],
      );
      const txn = txnRows[0];

      // Reverse of disbursement: credit loan account, debit pool
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, direction, amount_kobo)
         VALUES ($1, $2, 'credit', $3), ($1, $4, 'debit', $3)`,
        [txn.id, loanAccount, params.amountKobo, poolAccount],
      );

      // Check if loan is fully repaid
      const { rows: balRows } = await client.query(
        `SELECT
           COALESCE(SUM(CASE WHEN direction = 'debit'  THEN amount_kobo ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_kobo ELSE 0 END), 0)
           AS balance
         FROM ledger_entries
         WHERE account_id = $1`,
        [loanAccount],
      );
      const remaining = Number(balRows[0].balance);

      if (remaining <= 0) {
        await client.query(
          `UPDATE loans SET status = 'repaid'
           WHERE member_id = $1 AND coop_id = $2 AND status = 'disbursed'`,
          [params.memberId, params.coopId],
        );
      }

      return { transaction: txn, remaining_kobo: Math.max(0, remaining) };
    });
  }

  async listLoans(coopId: string, status?: string) {
    const { rows } = await this.db.query(
      `SELECT l.*, m.full_name AS member_name, m.phone AS member_phone
       FROM loans l
       JOIN members m ON m.id = l.member_id
       WHERE l.coop_id = $1
         AND ($2::text IS NULL OR l.status = $2)
       ORDER BY l.applied_at DESC`,
      [coopId, status || null],
    );
    return rows;
  }

  async listMemberLoans(coopId: string, memberId: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM loans WHERE coop_id = $1 AND member_id = $2 ORDER BY applied_at DESC`,
      [coopId, memberId],
    );
    return rows;
  }


  async getMemberBalance(coopId: string, memberId: string) {
    const { rows } = await this.db.query(
      `SELECT
         a.account_type,
         COALESCE(SUM(CASE WHEN le.direction = 'credit' THEN le.amount_kobo ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN le.direction = 'debit' THEN le.amount_kobo ELSE 0 END), 0)
         AS balance_kobo
       FROM accounts a
       LEFT JOIN ledger_entries le ON le.account_id = a.id
       WHERE a.coop_id = $1 AND a.member_id = $2
       GROUP BY a.account_type`,
      [coopId, memberId],
    );

    const balances: Record<string, number> = {};
    for (const row of rows) {
      balances[row.account_type] = Number(row.balance_kobo);
    }
    return balances;
  }

  async getCoopSummary(coopId: string) {
    const { rows: memberRows } = await this.db.query(
      `SELECT COUNT(*)::int AS member_count FROM members WHERE coop_id = $1`,
      [coopId],
    );

    const { rows: balanceRows } = await this.db.query(
      `SELECT
         a.account_type,
         COALESCE(SUM(CASE WHEN le.direction = 'credit' THEN le.amount_kobo ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN le.direction = 'debit' THEN le.amount_kobo ELSE 0 END), 0)
         AS balance_kobo
       FROM accounts a
       LEFT JOIN ledger_entries le ON le.account_id = a.id
       WHERE a.coop_id = $1
       GROUP BY a.account_type`,
      [coopId],
    );

    const balances: Record<string, number> = {};
    for (const row of balanceRows) {
      balances[row.account_type] = Number(row.balance_kobo);
    }

    return {
      member_count: memberRows[0]?.member_count || 0,
      total_savings_kobo: balances['savings'] || 0,
      pool_balance_kobo: balances['pool'] || 0,
    };
  }
}