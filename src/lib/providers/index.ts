import type { ChatProvider } from './types';
import type { ProviderId } from '@/types';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import { openrouterProvider } from './openrouter';

export const PROVIDERS: Record<ProviderId, ChatProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  openrouter: openrouterProvider,
};

export function getProvider(id: ProviderId): ChatProvider {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}
