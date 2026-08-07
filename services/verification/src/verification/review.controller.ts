import { Controller, Get, Param, Post } from '@nestjs/common';
import { ReviewService } from './review.service';

@Controller('verification/review')
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

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
