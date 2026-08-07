import { Injectable } from '@nestjs/common';
import { EMBEDDING_DIM, type EmbeddingProvider } from './embedding-provider.interface';

// DUMMY implementation — no real embedding-vendor account exists (Phase 6-
// style gap, same as liveness/SMS). This is NOT a placeholder that returns
// garbage, though: it's a genuine (if simplistic) bag-of-words hash
// embedding — texts sharing more words land closer together under cosine
// similarity, which is enough to prove the whole retrieval pipeline (embed
// -> store -> pgvector search -> rank) actually works end-to-end. What it
// can't do, which a real model would, is understand synonyms or meaning
// ("chai" vs "tea" are unrelated here) — that gap is why this stays a
// dummy, not a shipped feature.
@Injectable()
export class MockEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    const vector = new Array(EMBEDDING_DIM).fill(0);
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    for (const word of words) {
      const bucket = this.hashToBucket(word);
      vector[bucket] += 1;
    }

    return this.normalize(vector);
  }

  private hashToBucket(word: string): number {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    }
    return hash % EMBEDDING_DIM;
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map((v) => v / magnitude);
  }
}
