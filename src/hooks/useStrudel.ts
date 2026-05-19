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
  const modRef = useRef<StrudelGlobals | null>(null);

  const ensureInit = useCallback(async () => {
    if (initedRef.current && modRef.current) return modRef.current;
    setStatus('loading');
    setError(null);
    try {
      const mod = (await import('@strudel/web')) as unknown as StrudelGlobals;
      modRef.current = mod;
      mod.initStrudel({
        prebake: () => mod.samples('github:tidalcycles/dirt-samples'),
      });
      initedRef.current = true;
      setStatus('ready');
      return mod;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      throw err;
    }
  }, []);

  const play = useCallback(
    async (code: string) => {
      try {
        const mod = await ensureInit();
        const evaluate =
          mod.evaluate ??
          (typeof window !== 'undefined'
            ? (window as unknown as Partial<StrudelGlobals>).evaluate
            : undefined);
        if (typeof evaluate !== 'function') {
          throw new Error('Strudel evaluate() is unavailable. The @strudel/web module did not expose evaluate.');
        }
        await evaluate(code);
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
      const mod = modRef.current;
      const hush =
        mod?.hush ??
        (typeof window !== 'undefined'
          ? (window as unknown as Partial<StrudelGlobals>).hush
          : undefined);
      if (typeof hush === 'function') hush();
      setStatus(initedRef.current ? 'ready' : 'idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        const mod = modRef.current;
        const hush =
          mod?.hush ??
          (typeof window !== 'undefined'
            ? (window as unknown as Partial<StrudelGlobals>).hush
            : undefined);
        if (typeof hush === 'function') hush();
      } catch {
        // ignore
      }
    };
  }, []);

  return { status, error, play, stop };
}
