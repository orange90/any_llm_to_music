const FENCE_RE = /```(?:javascript|js|ts|typescript)?\s*\n([\s\S]*?)```/i;

export function extractCode(raw: string): string {
  if (!raw) return '';
  const match = raw.match(FENCE_RE);
  if (match && match[1]) return match[1].trim();
  const looseFence = raw.match(/```\s*\n([\s\S]*?)```/);
  if (looseFence && looseFence[1]) return looseFence[1].trim();
  return raw.trim();
}

export function summarizeTitle(prompt: string, max = 60): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned || 'Untitled';
  return cleaned.slice(0, max - 1) + '…';
}
