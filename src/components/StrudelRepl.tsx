'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { playbackBus } from '@/lib/strudel/playbackBus';
import { usePrefs } from './PreferencesProvider';

interface Props {
  code: string;
  onCodeChange?: (code: string) => void;
}

type PlayerStatus = 'loading' | 'ready' | 'playing' | 'error';

const STRUDEL_REPL_VERSION = '1.3.0';
const SCRIPT_SRC = `https://unpkg.com/@strudel/repl@${STRUDEL_REPL_VERSION}`;

let scriptPromise: Promise<void> | null = null;

function ensureStrudelReplScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.customElements && window.customElements.get('strudel-editor')) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-strudel-repl="true"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load @strudel/repl')), {
        once: true,
      });
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.dataset.strudelRepl = 'true';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load @strudel/repl'));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

export function StrudelRepl({ code, onCodeChange }: Props) {
  const instanceId = useId();
  const hostRef = useRef<HTMLDivElement>(null);
  const editorElRef = useRef<StrudelEditorElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const { t } = usePrefs();

  useEffect(() => {
    let cancelled = false;
    ensureStrudelReplScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scriptReady) return;
    const host = hostRef.current;
    if (!host) return;

    const el = document.createElement('strudel-editor') as StrudelEditorElement;
    el.setAttribute('code', code);
    host.innerHTML = '';
    host.appendChild(el);
    editorElRef.current = el;

    return () => {
      try {
        editorElRef.current?.editor?.stop?.();
      } catch {
        // ignore
      }
      if (playbackBus.getActive() === instanceId) {
        playbackBus.setActive(null);
      }
      host.innerHTML = '';
      editorElRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, instanceId]);

  useEffect(() => {
    const el = editorElRef.current;
    if (!el) return;
    let cancelled = false;
    const tryApply = () => {
      if (cancelled) return;
      const editor = el.editor;
      if (editor && typeof editor.setCode === 'function') {
        if (editor.code !== code) {
          editor.setCode(code);
        }
        return;
      }
      window.setTimeout(tryApply, 80);
    };
    tryApply();
    return () => {
      cancelled = true;
    };
  }, [code, scriptReady]);

  useEffect(() => {
    if (!scriptReady) return;
    const el = editorElRef.current;
    if (!el) return;

    let cancelled = false;
    let timer: number | null = null;
    let unsubscribe: (() => void) | null = null;
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { started?: boolean } | undefined;
      if (detail && typeof detail.started === 'boolean') {
        if (detail.started) {
          playbackBus.setActive(instanceId);
        } else if (playbackBus.getActive() === instanceId) {
          playbackBus.setActive(null);
        }
      }
    };

    const wrapStartStop = () => {
      if (cancelled) return;
      const editor = el.editor;
      if (
        !editor ||
        typeof editor.evaluate !== 'function' ||
        typeof editor.stop !== 'function'
      ) {
        timer = window.setTimeout(wrapStartStop, 100);
        return;
      }

      el.addEventListener('update', onUpdate as EventListener);

      setEditorReady(true);
      setIsActive(playbackBus.getActive() === instanceId);

      unsubscribe = playbackBus.subscribe((activeId) => {
        setIsActive(activeId === instanceId);
        if (activeId !== instanceId) {
          try {
            el.editor?.stop?.();
          } catch {
            // ignore
          }
        }
      });
    };
    wrapStartStop();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      if (unsubscribe) unsubscribe();
      el.removeEventListener('update', onUpdate as EventListener);
      setEditorReady(false);
      setIsActive(false);
    };
  }, [scriptReady, instanceId]);

  useEffect(() => {
    if (!onCodeChange || !scriptReady) return;
    const el = editorElRef.current;
    if (!el) return;
    let lastSeen = code;
    const id = window.setInterval(() => {
      const current = el.editor?.code;
      if (typeof current === 'string' && current !== lastSeen) {
        lastSeen = current;
        onCodeChange(current);
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [onCodeChange, scriptReady, code]);

  const handlePlay = useCallback(() => {
    const editor = editorElRef.current?.editor;
    if (!editor || typeof editor.evaluate !== 'function') return;
    try {
      playbackBus.setActive(instanceId);
      editor.evaluate();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [instanceId]);

  const handleStop = useCallback(() => {
    const editor = editorElRef.current?.editor;
    if (!editor || typeof editor.stop !== 'function') return;
    try {
      editor.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  let status: PlayerStatus;
  if (error) status = 'error';
  else if (!scriptReady || !editorReady) status = 'loading';
  else if (isActive) status = 'playing';
  else status = 'ready';

  const statusLabel =
    status === 'error'
      ? t.playerError
      : status === 'loading'
        ? t.playerLoading
        : status === 'playing'
          ? t.playerPlaying
          : t.playerEngineReady;

  const statusClass =
    status === 'error'
      ? 'text-red-500 dark:text-red-300'
      : status === 'playing'
        ? 'text-accent2'
        : status === 'loading'
          ? 'text-muted'
          : 'text-muted';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {isActive ? (
          <button
            type="button"
            onClick={handleStop}
            disabled={!editorReady}
            className="inline-flex items-center justify-center h-8 px-3 text-sm rounded-md font-medium bg-red-500/80 hover:bg-red-500 text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {t.playerStop}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            disabled={!editorReady}
            className="inline-flex items-center justify-center h-8 px-3 text-sm rounded-md font-medium bg-accent hover:bg-accent/90 text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {t.playerPlay}
          </button>
        )}
        <span className={`text-xs ${statusClass}`}>{statusLabel}</span>
      </div>
      <div
        ref={hostRef}
        className="strudel-host w-full min-h-[14rem] rounded-md border border-border overflow-hidden bg-codebg"
      />
      <p className="text-[11px] text-muted/80">{t.playerHint}</p>
      {!scriptReady && !error && (
        <p className="text-xs text-muted">Loading Strudel REPL…</p>
      )}
      {error && (
        <pre className="text-xs text-red-500 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2 whitespace-pre-wrap break-words">
          {error}
        </pre>
      )}
    </div>
  );
}
