import { Body, Controller, Inject, Post } from '@nestjs/common';
import { SMS_GATEWAY, type SmsGateway, type SmsMessage } from './sms-gateway.interface';

@Controller('sms')
export class SmsController {
  constructor(@Inject(SMS_GATEWAY) private readonly gateway: SmsGateway) {}

  @Post('send')
  send(@Body() body: SmsMessage) {
    return this.gateway.send(body);
  }
}
