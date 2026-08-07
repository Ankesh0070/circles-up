import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { EmbeddingModule } from './embedding/embedding.module';
import { QueryModule } from './query/query.module';

// Genie RAG Search Service — hyperlocal AI recommendation search (Group G,
// implementationplan.md phases 65-69).
@Module({
  imports: [EmbeddingModule, QueryModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
