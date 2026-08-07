import { Body, Controller, Post } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import type { DispatchSosDto } from './dto';

@Controller('sos')
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Post('dispatch')
  trigger(@Body() dto: DispatchSosDto) {
    return this.dispatch.dispatch(dto);
  }
}
