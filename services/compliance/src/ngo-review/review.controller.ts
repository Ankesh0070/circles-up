import { Controller, Get, Param, Post } from '@nestjs/common';
import { NgoReviewService } from './review.service';

@Controller('compliance/ngo-review')
export class NgoReviewController {
  constructor(private readonly review: NgoReviewService) {}

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
