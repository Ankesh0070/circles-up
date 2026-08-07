// Abstraction over whichever LLM gets picked for real answer synthesis
// (Claude, GPT, etc. — a real vendor decision, Phase-6-style). Nothing
// outside this folder should call a vendor SDK directly.
export interface GenieSource {
  postId: string;
  content: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface LlmProvider {
  synthesize(query: string, sources: GenieSource[]): Promise<string>;
}
