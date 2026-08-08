import { Module } from '@nestjs/common';
import { RECEIPT_PROVIDER } from './receipt-provider.interface';
import { MockReceiptProvider } from './mock-receipt.provider';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';

// TODO(vendor/product decision): swap `useClass: MockReceiptProvider` for
// a real receipt renderer once architecture.md §9's open decision #4
// (self-issued vs NGO-uploaded 80G receipts) is resolved.
@Module({
  controllers: [ReceiptsController],
  providers: [{ provide: RECEIPT_PROVIDER, useClass: MockReceiptProvider }, ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
