import { Controller, Param, Post } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';

@Controller('compliance/receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Post(':donationId/generate')
  generate(@Param('donationId') donationId: string) {
    return this.receipts.attemptGenerate(donationId);
  }

  // Internal-tool endpoint (no auth guard, not reachable from the mobile
  // app) — a real deployment calls this on a schedule (cron/queue worker).
  // Safe to call any time: donations already generated are skipped.
  @Post('reconcile')
  reconcile() {
    return this.receipts.reconcile();
  }
}
