import { Body, Controller, Post } from '@nestjs/common';
import { ServeService } from './serve.service';

@Controller('ads')
export class ServeController {
  constructor(private readonly serve: ServeService) {}

  @Post('serve')
  serveAd(@Body() body: { userId: string; neighbourhoodId: string }) {
    return this.serve.serveAd(body.userId, body.neighbourhoodId);
  }

  @Post('click')
  recordClick(@Body() body: { campaignId: string; userId: string }) {
    return this.serve.recordClick(body.campaignId, body.userId);
  }
}
