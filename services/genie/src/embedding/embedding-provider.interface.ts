// Phase 65/6-style dummy-provider pattern: abstraction over whichever real
// embedding model gets picked (OpenAI text-embedding-3-small, Cohere
// embed-v3, etc. — a real vendor decision not yet made). Nothing outside
// this folder should call a vendor SDK directly; inject EMBEDDING_PROVIDER.
//
// EMBEDDING_DIM must match supabase/migrations/..._genie_embeddings.sql's
// `vector(128)` column width — changing one requires changing both (and a
// migration, for a real production switch).
export const EMBEDDING_DIM = 128;

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}
