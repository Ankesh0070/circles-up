import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

// Genie RAG Search Service — hyperlocal AI recommendation search (Group G)
//
// Empty skeleton — real endpoints land when this service's phase (see
// implementationplan.md) is implemented. Only a health check exists for now,
// proving the service builds, boots, and is wired into CI.
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
