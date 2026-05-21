'use client';

import { useEffect, useState } from 'react';
import type { EndpointGenerateResult } from '@/types';
import { StrudelRepl } from './StrudelRepl';
import { usePrefs } from './PreferencesProvider';

interface Props {
  result: EndpointGenerateResult;
}

export function EndpointResultPanel({ result }: Props) {
  const [code, setCode] = useState<string>(result.code ?? '');
  const [showRaw, setShowRaw] = useState(false);
  const { t } = usePrefs();

  useEffect(() => {
    if (result.code && result.code !== code) {
      setCode(result.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.code]);

  return (
    <div className="border border-border rounded-md bg-panel2 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border bg-panel">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              result.pending
                ? 'bg-accent/20 text-accent'
                : result.ok
                  ? 'bg-accent2/20 text-accent2'
                  : 'bg-red-500/20 text-red-500 dark:text-red-300'
            }`}
          >
            {result.pending ? '⋯' : result.ok ? '✓' : '✗'}
          </span>
          <span className="text-sm font-medium truncate">{result.endpointName}</span>
          <span className="text-xs text-muted truncate">· {result.model}</span>
        </div>
        {result.raw && !result.pending && (
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-muted hover:text-text"
          >
            {showRaw ? t.panelHideRaw : t.panelShowRaw}
          </button>
        )}
      </div>

      {result.pending ? (
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span>{t.generating}</span>
          </div>
          <div className="h-3 rounded bg-panel animate-pulse" />
          <div className="h-3 rounded bg-panel animate-pulse w-5/6" />
          <div className="h-3 rounded bg-panel animate-pulse w-2/3" />
        </div>
      ) : result.ok ? (
        <div className="flex flex-col gap-2 p-3">
          <StrudelRepl code={code} onCodeChange={setCode} />
        </div>
      ) : (
        <div className="p-3">
          <pre className="text-xs text-red-500 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2 whitespace-pre-wrap break-words">
            {result.error || t.panelUnknownError}
          </pre>
        </div>
      )}

      {showRaw && result.raw && (
        <pre className="text-xs text-muted bg-panel border-t border-border p-2 max-h-48 overflow-auto scrollbar-thin whitespace-pre-wrap break-words">
          {result.raw}
        </pre>
      )}
    </div>
  );
}
