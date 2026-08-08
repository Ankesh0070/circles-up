import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ServeModule } from './serve/serve.module';
import { AdReviewModule } from './review/review.module';

// Ads Targeting Service — geospatial ad targeting + budget pacing (Group I,
// implementationplan.md phases 83-84).
@Module({
  imports: [ServeModule, AdReviewModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
