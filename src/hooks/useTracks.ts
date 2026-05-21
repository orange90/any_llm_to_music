'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Track } from '@/types';

const STORAGE_KEY = 'any_llm_to_music.tracks.v1';
const MAX_TRACKS = 200;

function readFromStorage(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Track[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.prompt === 'string' &&
        typeof t.code === 'string' &&
        typeof t.endpoint_name === 'string' &&
        typeof t.model === 'string' &&
        typeof t.created_at === 'number',
    );
  } catch {
    return [];
  }
}

function writeToStorage(tracks: Track[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch {
    // ignore quota / serialization errors
  }
}

export function useTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTracks(readFromStorage());
    setLoaded(true);
  }, []);

  const add = useCallback((track: Track) => {
    setTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      const next = [track, ...filtered].slice(0, MAX_TRACKS);
      writeToStorage(next);
      return next;
    });
  }, []);

  const addMany = useCallback((incoming: Track[]) => {
    if (!incoming.length) return;
    setTracks((prev) => {
      const map = new Map<string, Track>();
      [...incoming, ...prev].forEach((t) => {
        if (!map.has(t.id)) map.set(t.id, t);
      });
      const next = Array.from(map.values())
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, MAX_TRACKS);
      writeToStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setTracks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeToStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setTracks([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { tracks, loaded, add, addMany, remove, clear };
}
