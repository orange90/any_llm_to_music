const FENCE_RE = /```\s*(?:javascript|js|ts|typescript|strudel|mjs|cjs)?[ \t]*\r?\n?([\s\S]*?)(?:```|$)/i;
const LOOSE_FENCE_RE = /```[ \t]*\r?\n?([\s\S]*?)(?:```|$)/;
const LEADING_FENCE_RE = /^\s*```[ \t]*(?:javascript|js|ts|typescript|strudel|mjs|cjs)?[ \t]*\r?\n?/i;
const TRAILING_FENCE_RE = /\r?\n?[ \t]*```[\s\S]*$/;
const INLINE_LANG_TAG_RE = /^[ \t]*(?:javascript|js|ts|typescript|strudel)[ \t]*\r?\n/i;

function stripFences(input: string): string {
  return input
    .replace(LEADING_FENCE_RE, '')
    .replace(TRAILING_FENCE_RE, '')
    .replace(INLINE_LANG_TAG_RE, '')
    .trim();
}

export function extractCode(raw: string): string {
  if (!raw) return '';
  const match = raw.match(FENCE_RE);
  if (match && match[1] && match[1].trim()) return stripFences(match[1]);
  const looseFence = raw.match(LOOSE_FENCE_RE);
  if (looseFence && looseFence[1] && looseFence[1].trim()) return stripFences(looseFence[1]);
  return stripFences(raw);
}

export function summarizeTitle(prompt: string, max = 60): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned || 'Untitled';
  return cleaned.slice(0, max - 1) + '…';
}
