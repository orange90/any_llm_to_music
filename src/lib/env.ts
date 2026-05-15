import type { ProviderId, UserKeys } from '@/types';
import { PROVIDERS } from './providers';

export interface ServerProviderConfig {
  id: ProviderId;
  envApiKey?: string;
  envBaseURL?: string;
  envDefaultModel?: string;
}

export function readEnvConfig(): Record<ProviderId, ServerProviderConfig> {
  return {
    anthropic: {
      id: 'anthropic',
      envApiKey: process.env.ANTHROPIC_API_KEY || undefined,
      envBaseURL: undefined,
      envDefaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || undefined,
    },
    openai: {
      id: 'openai',
      envApiKey: process.env.OPENAI_API_KEY || undefined,
      envBaseURL: process.env.OPENAI_BASE_URL || undefined,
      envDefaultModel: process.env.OPENAI_DEFAULT_MODEL || undefined,
    },
    openrouter: {
      id: 'openrouter',
      envApiKey: process.env.OPENROUTER_API_KEY || undefined,
      envBaseURL: process.env.OPENROUTER_BASE_URL || undefined,
      envDefaultModel: process.env.OPENROUTER_DEFAULT_MODEL || undefined,
    },
  };
}

export function resolveCredentials(
  provider: ProviderId,
  userKeys?: UserKeys,
): { apiKey: string; baseURL?: string; source: 'env' | 'user' } {
  const env = readEnvConfig()[provider];
  const userEntry = userKeys?.[provider];
  const userKey = userEntry?.apiKey?.trim();
  const userBase = userEntry?.baseURL?.trim();
  if (userKey) {
    return { apiKey: userKey, baseURL: userBase || env.envBaseURL, source: 'user' };
  }
  if (env.envApiKey) {
    return { apiKey: env.envApiKey, baseURL: env.envBaseURL, source: 'env' };
  }
  throw new Error(
    `No API key configured for provider "${provider}". Set ${providerEnvName(provider)} or supply via Settings.`,
  );
}

export function providerEnvName(p: ProviderId): string {
  return p === 'anthropic'
    ? 'ANTHROPIC_API_KEY'
    : p === 'openai'
      ? 'OPENAI_API_KEY'
      : 'OPENROUTER_API_KEY';
}

interface CacheEntry {
  models: string[];
  expiresAt: number;
}
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const modelCache = new Map<string, CacheEntry>();

function cacheKey(provider: ProviderId, apiKey: string | undefined, baseURL: string | undefined) {
  return `${provider}|${apiKey ?? ''}|${baseURL ?? ''}`;
}

async function fetchModelsCached(
  provider: ProviderId,
  apiKey: string | undefined,
  baseURL: string | undefined,
): Promise<string[]> {
  const p = PROVIDERS[provider];
  const fallback = p.defaultModels;
  if (!p.listModels) return fallback;

  const key = cacheKey(provider, apiKey, baseURL);
  const now = Date.now();
  const cached = modelCache.get(key);
  if (cached && cached.expiresAt > now) return cached.models;

  try {
    const models = await p.listModels({ apiKey, baseURL });
    const result = models.length ? models : fallback;
    modelCache.set(key, { models: result, expiresAt: now + MODEL_CACHE_TTL_MS });
    return result;
  } catch {
    modelCache.set(key, { models: fallback, expiresAt: now + MODEL_CACHE_TTL_MS });
    return fallback;
  }
}

export async function listProviderInfo(userKeys?: UserKeys) {
  const env = readEnvConfig();
  const ids = Object.keys(PROVIDERS) as ProviderId[];
  return Promise.all(
    ids.map(async (id) => {
      const p = PROVIDERS[id];
      const envCfg = env[id];
      const userEntry = userKeys?.[id];
      const hasEnv = !!envCfg.envApiKey;
      const hasUser = !!userEntry?.apiKey?.trim();
      const source: 'env' | 'user' | 'none' = hasUser ? 'user' : hasEnv ? 'env' : 'none';

      const apiKey = userEntry?.apiKey?.trim() || envCfg.envApiKey;
      const baseURL = userEntry?.baseURL?.trim() || envCfg.envBaseURL;

      let models = p.defaultModels;
      if (apiKey || id === 'openrouter') {
        models = await fetchModelsCached(id, apiKey, baseURL);
      }

      const defaultModel =
        envCfg.envDefaultModel ||
        (models.includes(p.defaultModels[0]) ? p.defaultModels[0] : models[0]) ||
        p.defaultModels[0];

      return {
        id,
        label: p.label,
        models,
        defaultModel,
        configured: hasEnv || hasUser,
        source,
      };
    }),
  );
}
