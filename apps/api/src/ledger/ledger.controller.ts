import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Post('loans')
  apply(
    @Param('coopId') coopId: string,
    @Body()
    body: {
      member_id: string;
      principal_kobo: number;
      interest_rate: number;
      term_months: number;
    },
  ) {
    return this.ledger.applyForLoan({
      coopId,
      memberId: body.member_id,
      principalKobo: body.principal_kobo,
      interestRate: body.interest_rate,
      termMonths: body.term_months,
    });
  }

  @Get('loans')
  listLoans(
    @Param('coopId') coopId: string,
    @Query('status') status?: string,
  ) {
    return this.ledger.listLoans(coopId, status);
  }

  @Post('loans/:loanId/approve')
  approve(
    @Param('coopId') coopId: string,
    @Param('loanId') loanId: string,
  ) {
    return this.ledger.approveLoan(coopId, loanId);
  }

  @Post('loans/:loanId/reject')
  reject(
    @Param('coopId') coopId: string,
    @Param('loanId') loanId: string,
    @Body() body: { reason: string },
  ) {
    return this.ledger.rejectLoan(coopId, loanId, body.reason);
  }

  @Post('loans/:loanId/disburse')
  disburse(
    @Param('coopId') coopId: string,
    @Param('loanId') loanId: string,
  ) {
    return this.ledger.disburseLoan(coopId, loanId);
  }

  @Post('loans/repay')
  repay(
    @Param('coopId') coopId: string,
    @Body() body: { member_id: string; amount_kobo: number },
  ) {
    return this.ledger.repayLoan({
      coopId,
      memberId: body.member_id,
      amountKobo: body.amount_kobo,
    });
  }


  @Get('summary')
  summary(@Param('coopId') coopId: string) {
    return this.ledger.getCoopSummary(coopId);
  }
}