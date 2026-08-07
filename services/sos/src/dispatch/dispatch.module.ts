import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [SmsModule],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
