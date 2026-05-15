import OpenAI from 'openai';
import type { ChatProvider, GenerateOpts, ListModelsOpts } from './types';

const STATIC_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'o3',
  'o3-mini',
  'o4-mini',
  'o1',
  'o1-mini',
];

const CHAT_MODEL_PREFIXES = ['gpt-', 'o1', 'o3', 'o4', 'chatgpt-'];

export const openaiProvider: ChatProvider = {
  id: 'openai',
  label: 'OpenAI',
  defaultModels: STATIC_MODELS,
  async generate({ systemPrompt, userPrompt, model, apiKey, baseURL }: GenerateOpts) {
    const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
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
  async listModels({ apiKey, baseURL }: ListModelsOpts) {
    if (!apiKey) return STATIC_MODELS;
    const client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
    const page = await client.models.list();
    const ids = page.data
      .map((m) => m.id)
      .filter((id) => CHAT_MODEL_PREFIXES.some((p) => id.startsWith(p)))
      .filter((id) => !/(audio|tts|whisper|embedding|moderation|image|dall-e|realtime|transcribe)/i.test(id))
      .sort();
    return ids.length ? ids : STATIC_MODELS;
  },
};
