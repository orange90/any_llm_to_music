'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientEndpoint } from '@/types';

const STORAGE_KEY = 'any_llm_to_music.endpoints.v2';
const LEGACY_KEY = 'any_llm_to_music.userKeys.v1';

type LegacyEntry = { apiKey?: string; baseURL?: string };
type LegacyShape = {
  anthropic?: LegacyEntry;
  openai?: LegacyEntry;
  openrouter?: LegacyEntry;
};

const LEGACY_DEFAULTS: Record<
  keyof LegacyShape,
  { baseURL: string; model: string; name: string }
> = {
  anthropic: {
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-latest',
    name: 'Anthropic',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    name: 'OpenAI',
  },
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
    name: 'OpenRouter',
  },
};

export function genEndpointId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'ep_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function migrateLegacy(): ClientEndpoint[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyShape;
    const out: ClientEndpoint[] = [];
    (Object.keys(LEGACY_DEFAULTS) as Array<keyof LegacyShape>).forEach((id) => {
      const entry = parsed[id];
      if (entry?.apiKey?.trim()) {
        const def = LEGACY_DEFAULTS[id];
        out.push({
          id: genEndpointId(),
          name: def.name,
          baseURL: entry.baseURL?.trim() || def.baseURL,
          apiKey: entry.apiKey.trim(),
          model: def.model,
        });
      }
    });
    return out;
  } catch {
    return [];
  }
}

export function useEndpoints() {
  const [endpoints, setEndpoints] = useState<ClientEndpoint[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ClientEndpoint[];
        if (Array.isArray(parsed)) {
          setEndpoints(parsed);
          setLoaded(true);
          return;
        }
      }
      const migrated = migrateLegacy();
      if (migrated.length) {
        setEndpoints(migrated);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const save = useCallback((next: ClientEndpoint[]) => {
    setEndpoints(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const clear = useCallback(() => {
    setEndpoints([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { endpoints, save, clear, loaded };
}

export function makeEmptyEndpoint(): ClientEndpoint {
  return {
    id: genEndpointId(),
    name: '',
    baseURL: '',
    apiKey: '',
    model: '',
  };
}
