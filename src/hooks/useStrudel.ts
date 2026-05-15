'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type StrudelGlobals = {
  initStrudel: (opts?: { prebake?: () => unknown }) => void;
  evaluate: (code: string) => Promise<unknown> | unknown;
  hush: () => void;
  samples: (src: string) => Promise<unknown> | unknown;
};

export type StrudelStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'error';

export function useStrudel() {
  const [status, setStatus] = useState<StrudelStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const initedRef = useRef(false);

  const ensureInit = useCallback(async () => {
    if (initedRef.current) return;
    setStatus('loading');
    setError(null);
    try {
      const mod = (await import('@strudel/web')) as unknown as StrudelGlobals;
      mod.initStrudel({
        prebake: () => mod.samples('github:tidalcycles/dirt-samples'),
      });
      initedRef.current = true;
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      throw err;
    }
  }, []);

  const play = useCallback(
    async (code: string) => {
      try {
        await ensureInit();
        const w = window as unknown as StrudelGlobals;
        await w.evaluate(code);
        setStatus('playing');
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [ensureInit],
  );

  const stop = useCallback(() => {
    try {
      const w = window as unknown as StrudelGlobals;
      w.hush?.();
      setStatus(initedRef.current ? 'ready' : 'idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        const w = window as unknown as StrudelGlobals;
        w.hush?.();
      } catch {
        // ignore
      }
    };
  }, []);

  return { status, error, play, stop };
}
