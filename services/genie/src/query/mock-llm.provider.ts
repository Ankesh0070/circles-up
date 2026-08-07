import { Injectable } from '@nestjs/common';
import type { GenieSource, LlmProvider } from './llm-provider.interface';

// TODO(vendor decision): swap for a real LLM (Claude, GPT, ...) later —
// same Phase-6-style dummy pattern as every other provider in this app.
//
// Deliberately extractive rather than generative: it builds the answer out
// of literal double-quoted excerpts from `sources`, one sentence per
// source, so `isGrounded()` (grounding.ts) can mechanically verify every
// quote traces back to real neighbour content. A real LLM synthesizing
// prose would need to be instructed to quote sources this same way, or
// isGrounded would reject nearly everything it produces.
@Injectable()
export class MockLlmProvider implements LlmProvider {
  async synthesize(query: string, sources: GenieSource[]): Promise<string> {
    if (sources.length === 0) {
      return "I couldn't find any neighbourhood posts about that yet.";
    }

    const sentences = sources.map((s) => {
      const excerpt = firstSentence(s.content);
      return `${s.authorName} mentioned: "${excerpt}"`;
    });

    // Deliberately NOT wrapping `query` in quotes here — isGrounded()
    // treats every double-quoted span as a claim to verify against source
    // content, and the user's own query text will never appear verbatim in
    // a neighbour's post. Quoting it would make every real answer fail its
    // own grounding check.
    return `Here's what neighbours have said about that:\n\n${sentences.join('\n')}`;
  }
}

function firstSentence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^.{1,180}?[.!?](\s|$)/);
  return (match ? match[0] : trimmed.slice(0, 180)).trim();
}
