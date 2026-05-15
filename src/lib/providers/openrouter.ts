import OpenAI from 'openai';
import type { ChatProvider, GenerateOpts, ListModelsOpts } from './types';

const DEFAULT_BASE = 'https://openrouter.ai/api/v1';

const STATIC_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-opus-4',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/o3-mini',
  'openai/o4-mini',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'meta-llama/llama-3.3-70b-instruct',
  'meta-llama/llama-3.1-70b-instruct',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-r1',
  'qwen/qwen-2.5-72b-instruct',
  'mistralai/mistral-large',
  'x-ai/grok-2',
];

export const openrouterProvider: ChatProvider = {
  id: 'openrouter',
  label: 'OpenRouter',
  defaultModels: STATIC_MODELS,
  async generate({ systemPrompt, userPrompt, model, apiKey, baseURL }: GenerateOpts) {
    const client = new OpenAI({
      apiKey,
      baseURL: baseURL || DEFAULT_BASE,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'any_llm_to_music',
      },
    });
    const res = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  },
  async listModels({ baseURL }: ListModelsOpts) {
    try {
      const base = baseURL?.replace(/\/$/, '') || DEFAULT_BASE;
      const res = await fetch(`${base}/models`);
      if (!res.ok) return STATIC_MODELS;
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const ids = (data.data ?? []).map((m) => m.id).sort();
      return ids.length ? ids : STATIC_MODELS;
    } catch {
      return STATIC_MODELS;
    }
  },
};
