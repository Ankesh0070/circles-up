import { Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { MockRazorpayProvider } from './mock-razorpay.provider';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { ReceiptsModule } from '../receipts/receipts.module';

// TODO(vendor decision): once a real Razorpay account is contracted,
// replace `useClass: MockRazorpayProvider` with the real provider class —
// no other file changes.
@Module({
  imports: [ReceiptsModule],
  controllers: [DonationsController],
  providers: [{ provide: PAYMENT_PROVIDER, useClass: MockRazorpayProvider }, DonationsService],
})
export class DonationsModule {}
