import { Body, Controller, Inject, Post } from '@nestjs/common';
import { LIVENESS_PROVIDER, type LivenessProvider, type LivenessCheckRequest } from './liveness-provider.interface';

@Controller('liveness')
export class LivenessController {
  constructor(@Inject(LIVENESS_PROVIDER) private readonly provider: LivenessProvider) {}

  @Post('check')
  check(@Body() body: LivenessCheckRequest) {
    return this.provider.checkLiveness(body);
  }
}
