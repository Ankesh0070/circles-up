import { Body, Controller, Param, Post } from '@nestjs/common';
import { DonationsService } from './donations.service';

@Controller('compliance/donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Post()
  createOrder(@Body() body: { ngoPageId: string; donorId: string; amount: number }) {
    return this.donations.createOrder(body.ngoPageId, body.donorId, body.amount);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() body: { clientPaymentId: string }) {
    return this.donations.confirm(id, body.clientPaymentId);
  }
}
