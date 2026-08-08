import { Controller, Get, Param, Post } from '@nestjs/common';
import { AdReviewService } from './review.service';

@Controller('ads/review')
export class AdReviewController {
  constructor(private readonly review: AdReviewService) {}

  @Get('queue')
  queue() {
    return this.review.listPending();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.review.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.review.reject(id);
  }
}
