import { Body, Controller, Post } from '@nestjs/common';
import { VerificationService } from './verification.service';
import type { SubmitVerificationDto } from './dto';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post('submit')
  submit(@Body() dto: SubmitVerificationDto) {
    return this.verification.submit(dto);
  }
}
