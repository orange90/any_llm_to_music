import type { ClientEndpoint } from '@/types';

export interface DefaultLlmConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  dailyLimit: number;
}

export function readDefaultLlmConfig(): DefaultLlmConfig | null {
  const baseURL = process.env.DEFAULT_LLM_BASE_URL?.trim();
  const apiKey = process.env.DEFAULT_LLM_API_KEY?.trim();
  const model = process.env.DEFAULT_LLM_MODEL?.trim();
  if (!baseURL || !apiKey || !model) return null;
  const limitRaw = process.env.DEFAULT_LLM_DAILY_LIMIT?.trim();
  const dailyLimit = limitRaw ? Math.max(0, Number.parseInt(limitRaw, 10) || 0) : 100;
  return { baseURL, apiKey, model, dailyLimit };
}

export function hasUserEndpoints(eps?: ClientEndpoint[] | null): eps is ClientEndpoint[] {
  if (!eps || !Array.isArray(eps)) return false;
  return eps.some(
    (e) => e && e.apiKey?.trim() && e.baseURL?.trim() && e.model?.trim(),
  );
}

export const DEFAULT_QUOTA_EXCEEDED_MESSAGES = {
  zh: '官方提供的AI接口额度不足，可自行接入API',
  en: 'The built-in AI endpoint has run out of daily quota. Add your own API endpoint in Settings to keep going.',
} as const;

export type DefaultQuotaExceededLang = keyof typeof DEFAULT_QUOTA_EXCEEDED_MESSAGES;

export function getDefaultQuotaExceededMessage(lang?: string | null): string {
  if (lang === 'en' || lang === 'zh') return DEFAULT_QUOTA_EXCEEDED_MESSAGES[lang];
  return DEFAULT_QUOTA_EXCEEDED_MESSAGES.zh;
}

export const DEFAULT_QUOTA_EXCEEDED_MESSAGE = DEFAULT_QUOTA_EXCEEDED_MESSAGES.zh;
