import type { GenieSource } from './llm-provider.interface';

// Phase 68 (edgecase.md §4.1 🔴, §4.5): two independent safety functions,
// both real and testable, not comments describing what a real LLM
// integration would need to do someday.

// edgecase.md §4.5: retrieved post content is untrusted user input and
// must be treated as DATA in any future LLM prompt, never as instructions.
// Strips patterns that look like an attempt to redirect an LLM's behaviour
// before that content is ever used as a "source". Matters today for the
// mock too — this is what a real integration would build on, not
// something deferred until a real vendor exists.
const INJECTION_PATTERNS = [
  /ignore (all |the )?(previous|above|prior) instructions?/gi,
  /disregard (all |the )?(previous|above|prior) instructions?/gi,
  /system\s*:/gi,
  /you are now/gi,
  /new instructions?:/gi,
];

export function sanitizeSourceContent(content: string): string {
  let sanitized = content;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }
  return sanitized;
}

// edgecase.md §4.1 (🔴): the whole value proposition of Genie is that
// answers are grounded in real neighbour posts, not invented. Rather than
// trust an LLM's own claim of groundedness, this independently verifies:
// every double-quoted span in the answer must appear verbatim in at least
// one source's content. An answer with a fabricated quote is rejected,
// not shipped with a "trust me" disclaimer.
export function isGrounded(answer: string, sources: GenieSource[]): boolean {
  const quotes = [...answer.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (quotes.length === 0) return true; // nothing quoted to verify (e.g. the cold-start fallback copy)
  return quotes.every((quote) => sources.some((s) => s.content.includes(quote)));
}
