import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  public pool!: Pool;

  async onModuleInit() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await this.pool.query('SELECT 1');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  query<T extends QueryResultRow = any>(text: string, params?: any[]) {
    return this.pool.query<T>(text, params);
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}