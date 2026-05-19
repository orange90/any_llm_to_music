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

export const DEFAULT_QUOTA_EXCEEDED_MESSAGE =
  '官方提供的AI接口额度不足，可自行接入API';
