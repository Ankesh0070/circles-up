import { Module } from '@nestjs/common';
import { AdReviewController } from './review.controller';
import { AdReviewService } from './review.service';

@Module({
  controllers: [AdReviewController],
  providers: [AdReviewService],
})
export class AdReviewModule {}
