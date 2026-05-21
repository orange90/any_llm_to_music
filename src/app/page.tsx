'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  ClientEndpoint,
  EndpointGenerateResult,
  GenerateResponse,
  HistoryEntry,
} from '@/types';
import { PromptPanel } from '@/components/PromptPanel';
import { HistoryList } from '@/components/HistoryList';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { EndpointResultPanel } from '@/components/EndpointResultPanel';
import { Button } from '@/components/ui/Button';
import { useEndpoints } from '@/hooks/useEndpoints';
import { useTracks } from '@/hooks/useTracks';
import { usePrefs } from '@/components/PreferencesProvider';
import type { Strings } from '@/lib/i18n';

interface RuntimeError {
  message: string;
  quotaExceeded?: boolean;
  defaultQuota?: { limit: number; used: number; remaining: number };
}

export default function HomePage() {
  const { endpoints, save, clear, loaded } = useEndpoints();
  const { t } = usePrefs();

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<RuntimeError | null>(null);
  const [results, setResults] = useState<EndpointGenerateResult[]>([]);
  const [source, setSource] = useState<'default' | 'user' | null>(null);
  const [defaultQuota, setDefaultQuota] = useState<GenerateResponse['defaultQuota'] | null>(
    null,
  );

  const { entries, loaded: tracksLoaded, add: addEntry, remove } = useTracks();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const requestIdRef = useRef(0);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    const requestId = ++requestIdRef.current;
    setGenerating(true);
    setGenError(null);
    setSource(null);

    const validEndpoints = endpoints.filter(
      (e) => e.apiKey.trim() && e.baseURL.trim() && e.model.trim(),
    );
    const useUser = validEndpoints.length > 0;

    const placeholders: EndpointGenerateResult[] = useUser
      ? validEndpoints.map((ep) => ({
          endpointId: ep.id,
          endpointName: ep.name,
          model: ep.model,
          ok: false,
          pending: true,
        }))
      : [
          {
            endpointId: 'default',
            endpointName: 'Default',
            model: '…',
            ok: false,
            pending: true,
          },
        ];
    setResults(placeholders);
    setSource(useUser ? 'user' : 'default');

    const finalResults: EndpointGenerateResult[] = [...placeholders];

    const callOne = async (
      ep: ClientEndpoint | null,
      slotIndex: number,
    ): Promise<void> => {
      const placeholder = placeholders[slotIndex];
      try {
        const body = {
          prompt,
          endpoints: ep ? [ep] : undefined,
        };
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (requestIdRef.current !== requestId) return;

        if (!res.ok) {
          if (data?.defaultQuota) setDefaultQuota(data.defaultQuota);
          if (!ep) {
            setGenError({
              message: data?.error || `HTTP ${res.status}`,
              quotaExceeded: data?.quotaExceeded === true,
              defaultQuota: data?.defaultQuota,
            });
          }
          const errResult: EndpointGenerateResult = {
            endpointId: placeholder.endpointId,
            endpointName: placeholder.endpointName,
            model: placeholder.model,
            ok: false,
            error: data?.error || `HTTP ${res.status}`,
          };
          finalResults[slotIndex] = errResult;
          setResults((prev) => {
            const next = [...prev];
            next[slotIndex] = errResult;
            return next;
          });
          return;
        }

        const ok = data as GenerateResponse;
        if (ok.defaultQuota) setDefaultQuota(ok.defaultQuota);
        const single = ok.results[0];
        const merged: EndpointGenerateResult = single
          ? single
          : {
              endpointId: placeholder.endpointId,
              endpointName: placeholder.endpointName,
              model: placeholder.model,
              ok: false,
              error: '接口无返回',
            };
        finalResults[slotIndex] = merged;
        setResults((prev) => {
          const next = [...prev];
          next[slotIndex] = merged;
          return next;
        });
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        const errResult: EndpointGenerateResult = {
          endpointId: placeholder.endpointId,
          endpointName: placeholder.endpointName,
          model: placeholder.model,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        finalResults[slotIndex] = errResult;
        setResults((prev) => {
          const next = [...prev];
          next[slotIndex] = errResult;
          return next;
        });
      }
    };

    const tasks = useUser
      ? validEndpoints.map((ep, i) => callOne(ep, i))
      : [callOne(null, 0)];

    await Promise.all(tasks);

    if (requestIdRef.current !== requestId) return;

    setGenerating(false);

    if (finalResults.some((r) => r.ok)) {
      const firstTrack = finalResults.find((r) => r.track)?.track;
      const entry: HistoryEntry = {
        id:
          firstTrack?.id ??
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: firstTrack?.title ?? prompt.trim().slice(0, 60),
        prompt,
        created_at: firstTrack?.created_at ?? Date.now(),
        source: useUser ? 'user' : 'default',
        results: finalResults,
      };
      addEntry(entry);
    }
  }, [prompt, endpoints, addEntry]);

  const handleDelete = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  const handlePickEntry = useCallback((entry: HistoryEntry) => {
    requestIdRef.current++;
    setPrompt(entry.prompt);
    setResults(entry.results);
    setSource(entry.source);
    setGenError(null);
    setGenerating(false);
  }, []);

  const usingDefault = endpoints.length === 0 || !endpoints.some((e) => e.apiKey.trim());
  const customCount = endpoints.filter((e) => e.apiKey.trim()).length;
  const tracksLoading = !tracksLoaded || !loaded;

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <h1 className="font-semibold">any_llm_to_music</h1>
          <span className="text-xs text-muted ml-2">{t.appTagline}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {usingDefault ? (
              <>
                {t.usingDefault}
                {defaultQuota && <> {' · '}{t.todayQuota(defaultQuota.used, defaultQuota.limit)}</>}
              </>
            ) : (
              <>{t.customEndpointsCount(endpoints.length)}</>
            )}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            ⚙ {t.settings}
          </Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[360px_1fr] overflow-hidden">
        <aside className="border-r border-border bg-panel p-4 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
          <PromptPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            onGenerate={handleGenerate}
            loading={generating}
            disabled={false}
          />
          <p className="text-xs text-muted -mt-2">
            {usingDefault ? t.willUseDefault : t.willUseCustom(customCount)}
          </p>
          {genError && (
            <div
              className={`text-xs rounded p-2 whitespace-pre-wrap break-words border ${
                genError.quotaExceeded
                  ? 'text-amber-700 dark:text-amber-200 bg-amber-500/10 border-amber-500/40'
                  : 'text-red-600 dark:text-red-300 bg-red-500/10 border-red-500/30'
              }`}
            >
              {genError.message}
              {genError.quotaExceeded && (
                <div className="mt-1 text-amber-600 dark:text-amber-300/80">{t.quotaHint}</div>
              )}
            </div>
          )}
          <div className="mt-2 flex-1 min-h-0 flex flex-col">
            <HistoryList
              entries={entries}
              onPick={handlePickEntry}
              onDelete={handleDelete}
              loading={tracksLoading}
            />
          </div>
        </aside>

        <section className="p-4 overflow-y-auto scrollbar-thin">
          {results.length === 0 ? (
            <EmptyState usingDefault={usingDefault} configured={endpoints.length} t={t} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-muted">
                {source === 'default' && t.sourceDefault}
                {source === 'user' && t.sourceUser(results.length)}
                <span className="ml-2 text-muted/70">{t.singletonNote}</span>
              </div>
              <div
                className={`grid gap-4 ${
                  results.length === 1
                    ? 'grid-cols-1'
                    : results.length === 2
                      ? 'grid-cols-1 lg:grid-cols-2'
                      : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {results.map((r) => (
                  <EndpointResultPanel key={r.endpointId} result={r} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        endpoints={endpoints}
        onSave={(next) => save(next)}
        onClear={() => clear()}
      />
    </main>
  );
}

function EmptyState({
  usingDefault,
  configured,
  t,
}: {
  usingDefault: boolean;
  configured: number;
  t: Strings;
}) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-md text-center text-sm text-muted border border-dashed border-border rounded-lg p-8">
        <div className="text-3xl mb-2">🎼</div>
        <p className="mb-2">
          {usingDefault ? t.emptyTitleDefault : t.emptyTitleCustom(configured)}
        </p>
        <p className="text-xs text-muted/70">{t.emptyHint}</p>
      </div>
    </div>
  );
}
