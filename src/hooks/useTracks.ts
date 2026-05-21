'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EndpointGenerateResult, HistoryEntry } from '@/types';

const STORAGE_KEY = 'any_llm_to_music.history.v2';
const LEGACY_TRACKS_KEY = 'any_llm_to_music.tracks.v1';
const MAX_ENTRIES = 100;

interface LegacyTrack {
  id: string;
  title: string;
  prompt: string;
  code: string;
  endpoint_name: string;
  model: string;
  created_at: number;
}

function isEndpointResult(value: unknown): value is EndpointGenerateResult {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.endpointId === 'string' &&
    typeof r.endpointName === 'string' &&
    typeof r.model === 'string' &&
    typeof r.ok === 'boolean'
  );
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.title === 'string' &&
    typeof e.prompt === 'string' &&
    typeof e.created_at === 'number' &&
    (e.source === 'default' || e.source === 'user') &&
    Array.isArray(e.results) &&
    e.results.every(isEndpointResult)
  );
}

function migrateLegacy(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_TRACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const legacy = parsed.filter(
      (t): t is LegacyTrack =>
        Boolean(t) &&
        typeof (t as LegacyTrack).id === 'string' &&
        typeof (t as LegacyTrack).title === 'string' &&
        typeof (t as LegacyTrack).prompt === 'string' &&
        typeof (t as LegacyTrack).code === 'string' &&
        typeof (t as LegacyTrack).endpoint_name === 'string' &&
        typeof (t as LegacyTrack).model === 'string' &&
        typeof (t as LegacyTrack).created_at === 'number',
    );
    return legacy.map<HistoryEntry>((t) => ({
      id: t.id,
      title: t.title,
      prompt: t.prompt,
      created_at: t.created_at,
      source: 'user',
      results: [
        {
          endpointId: t.id,
          endpointName: t.endpoint_name,
          model: t.model,
          ok: true,
          code: t.code,
        },
      ],
    }));
  } catch {
    return [];
  }
}

function readFromStorage(): HistoryEntry[] {
  let current: HistoryEntry[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        current = parsed.filter(isHistoryEntry);
      }
    }
  } catch {
    current = [];
  }

  if (current.length === 0) {
    const migrated = migrateLegacy();
    if (migrated.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_TRACKS_KEY);
      } catch {
        // ignore
      }
      return migrated;
    }
  }

  return current;
}

function writeToStorage(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota / serialization errors
  }
}

export function useTracks() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(readFromStorage());
    setLoaded(true);
  }, []);

  const add = useCallback((entry: HistoryEntry) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.id !== entry.id);
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
      writeToStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeToStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { entries, loaded, add, remove, clear };
}
