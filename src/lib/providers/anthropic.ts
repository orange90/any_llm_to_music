import Anthropic from '@anthropic-ai/sdk';
import type { ChatProvider, GenerateOpts, ListModelsOpts } from './types';

const STATIC_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-3-opus-latest',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

export const anthropicProvider: ChatProvider = {
  id: 'anthropic',
  label: 'Anthropic',
  defaultModels: STATIC_MODELS,
  async generate({ systemPrompt, userPrompt, model, apiKey, baseURL }: GenerateOpts) {
    const client = new Anthropic({ apiKey, baseURL: baseURL || undefined });
    const res = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = res.content
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();
    return text;
  },
  async listModels({ apiKey, baseURL }: ListModelsOpts) {
    if (!apiKey) return STATIC_MODELS;
    try {
      const url = `${baseURL?.replace(/\/$/, '') || 'https://api.anthropic.com'}/v1/models`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) return STATIC_MODELS;
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const ids = (data.data ?? []).map((m) => m.id).sort();
      return ids.length ? ids : STATIC_MODELS;
    } catch {
      return STATIC_MODELS;
    }
  },
};
