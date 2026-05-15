'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserKeys } from '@/types';

const STORAGE_KEY = 'any_llm_to_music.userKeys.v1';

export function useLocalKeys() {
  const [keys, setKeys] = useState<UserKeys>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setKeys(JSON.parse(raw) as UserKeys);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const save = useCallback((next: UserKeys) => {
    setKeys(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const clear = useCallback(() => {
    setKeys({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { keys, save, clear, loaded };
}

export function serializeKeysHeader(keys: UserKeys): string {
  return JSON.stringify(keys);
}
