import { Module } from '@nestjs/common';
import { EMBEDDING_PROVIDER } from './embedding-provider.interface';
import { MockEmbeddingProvider } from './mock-embedding.provider';
import { EmbeddingService } from './embedding.service';
import { EmbeddingController } from './embedding.controller';

// TODO(vendor decision): once a real embedding provider is picked, replace
// `useClass: MockEmbeddingProvider` with the real provider class — no
// other file changes.
@Module({
  controllers: [EmbeddingController],
  providers: [{ provide: EMBEDDING_PROVIDER, useClass: MockEmbeddingProvider }, EmbeddingService],
  exports: [EmbeddingService, EMBEDDING_PROVIDER],
})
export class EmbeddingModule {}
