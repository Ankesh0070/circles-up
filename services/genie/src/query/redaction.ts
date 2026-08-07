// Phase 69 (edgecase.md §4.4): a post shared informally ("call Ramesh at
// 98xxxxxxx") had that number visible in its ORIGINAL context — resurfacing
// it verbatim in a synthesized Genie answer, outside that context, is a
// real privacy question the edge case flags. Applied to source content
// BEFORE it's ever quoted into an answer, not as a regex pass over the
// final answer (which would miss reformatted numbers the LLM re-typed).
const PHONE_PATTERN = /(\+?91[\s-]?)?\d{10}\b|\b\d{5}[\s-]?\d{5}\b/g;

export function redactPhoneNumbers(content: string): string {
  return content.replace(PHONE_PATTERN, '[phone number removed — see the original post]');
}
