import { Module } from '@nestjs/common';
import { LivenessModule } from '../liveness/liveness.module';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [LivenessModule],
  controllers: [VerificationController, ReviewController],
  providers: [VerificationService, ReviewService],
})
export class VerificationModule {}
