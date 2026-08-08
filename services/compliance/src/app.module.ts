import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { NgoReviewModule } from './ngo-review/review.module';
import { DonationsModule } from './donations/donations.module';
import { ReceiptsModule } from './receipts/receipts.module';

// Compliance Service — NGO donation approval, Razorpay + receipts (Group I,
// implementationplan.md phases 79-80).
@Module({
  imports: [NgoReviewModule, DonationsModule, ReceiptsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
