import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { LLM_PROVIDER } from './llm-provider.interface';
import { MockLlmProvider } from './mock-llm.provider';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';

// TODO(vendor decision): once a real LLM is picked, replace
// `useClass: MockLlmProvider` with the real provider class — no other
// file changes.
@Module({
  imports: [EmbeddingModule],
  controllers: [QueryController],
  providers: [{ provide: LLM_PROVIDER, useClass: MockLlmProvider }, QueryService],
})
export class QueryModule {}
