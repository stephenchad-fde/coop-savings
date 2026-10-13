import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LedgerService } from './ledger.service';

@Controller('coops/:coopId')
export class LedgerController {
  constructor(private ledger: LedgerService) {}

  @Post('contributions')
  contribution(
    @Param('coopId') coopId: string,
    @Body() body: { member_id: string; amount_kobo: number },
  ) {
    return this.ledger.recordContribution({
      coopId,
      memberId: body.member_id,
      amountKobo: body.amount_kobo,
    });
  }

  @Get('members/:memberId/balance')
  memberBalance(
    @Param('coopId') coopId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.ledger.getMemberBalance(coopId, memberId);
  }

  @Get('summary')
  summary(@Param('coopId') coopId: string) {
    return this.ledger.getCoopSummary(coopId);
  }
}