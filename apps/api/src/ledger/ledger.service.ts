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