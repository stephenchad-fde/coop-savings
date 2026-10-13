import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class CoopsService {
  constructor(private db: DbService) {}

  async createCoop(name: string) {
    const { rows } = await this.db.query(
      `INSERT INTO cooperatives (name) VALUES ($1) RETURNING *`,
      [name],
    );
    const coop = rows[0];
    await this.db.query(
      `INSERT INTO accounts (coop_id, member_id, account_type)
       VALUES ($1, NULL, 'pool')`,
      [coop.id],
    );
    return coop;
  }

  async listCoops() {
    const { rows } = await this.db.query(
      `SELECT * FROM cooperatives ORDER BY created_at DESC`,
    );
    return rows;
  }

  async getCoop(id: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM cooperatives WHERE id = $1`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Cooperative not found');
    return rows[0];
  }

  async addMember(coopId: string, fullName: string, phone: string) {
    await this.getCoop(coopId);
    const { rows } = await this.db.query(
      `INSERT INTO members (coop_id, full_name, phone)
       VALUES ($1, $2, $3) RETURNING *`,
      [coopId, fullName, phone],
    );
    const member = rows[0];
    await this.db.query(
      `INSERT INTO accounts (coop_id, member_id, account_type)
       VALUES ($1, $2, 'savings')`,
      [coopId, member.id],
    );
    return member;
  }

  async listMembers(coopId: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM members WHERE coop_id = $1 ORDER BY joined_at DESC`,
      [coopId],
    );
    return rows;
  }
}