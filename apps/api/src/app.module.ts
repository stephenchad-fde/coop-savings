import 'dotenv/config';
import { Module, Controller, Get, Inject } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { DbService } from './db/db.service';
import { CoopsModule } from './coops/coops.module';
import { LedgerModule } from './ledger/ledger.module';

@Controller()
class HealthController {
  constructor(@Inject(DbService) private db: DbService) {}

  @Get()
  health() {
    return { status: 'ok' };
  }

  @Get('db')
  async dbCheck() {
    const result = await this.db.query('SELECT NOW() AS now');
    return { connected: true, time: result.rows[0].now };
  }
}

@Module({
  imports: [DbModule, CoopsModule, LedgerModule],
  controllers: [HealthController],
})
export class AppModule {}