export type ProviderId = 'anthropic' | 'openai' | 'openrouter';

export interface Track {
  id: string;
  title: string;
  prompt: string;
  code: string;
  provider: ProviderId;
  model: string;
  created_at: number;
}

export interface UserKeys {
  anthropic?: { apiKey?: string; baseURL?: string };
  openai?: { apiKey?: string; baseURL?: string };
  openrouter?: { apiKey?: string; baseURL?: string };
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  models: string[];
  defaultModel: string;
  configured: boolean;
  source: 'env' | 'user' | 'none';
}

export interface GenerateRequest {
  prompt: string;
  provider: ProviderId;
  model: string;
  userKeys?: UserKeys;
}

export interface GenerateResponse {
  code: string;
  raw: string;
  track: Track;
}
