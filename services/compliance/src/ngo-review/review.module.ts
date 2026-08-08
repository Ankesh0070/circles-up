import { Module } from '@nestjs/common';
import { NgoReviewController } from './review.controller';
import { NgoReviewService } from './review.service';

@Module({
  controllers: [NgoReviewController],
  providers: [NgoReviewService],
})
export class NgoReviewModule {}
