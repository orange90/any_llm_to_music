'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  EndpointGenerateResult,
  GenerateResponse,
  Track,
} from '@/types';
import { PromptPanel } from '@/components/PromptPanel';
import { HistoryList } from '@/components/HistoryList';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { EndpointResultPanel } from '@/components/EndpointResultPanel';
import { Button } from '@/components/ui/Button';
import { useEndpoints } from '@/hooks/useEndpoints';

interface RuntimeError {
  message: string;
  quotaExceeded?: boolean;
  defaultQuota?: { limit: number; used: number; remaining: number };
}

export default function HomePage() {
  const { endpoints, save, clear, loaded } = useEndpoints();

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<RuntimeError | null>(null);
  const [results, setResults] = useState<EndpointGenerateResult[]>([]);
  const [source, setSource] = useState<'default' | 'user' | null>(null);
  const [defaultQuota, setDefaultQuota] = useState<GenerateResponse['defaultQuota'] | null>(
    null,
  );

  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const refreshTracks = useCallback(async () => {
    setTracksLoading(true);
    try {
      const res = await fetch('/api/tracks');
      const data = (await res.json()) as { tracks: Track[] };
      setTracks(data.tracks);
    } catch (err) {
      console.error(err);
    } finally {
      setTracksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    refreshTracks();
  }, [loaded, refreshTracks]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError(null);
    setResults([]);
    setSource(null);
    try {
      const validEndpoints = endpoints.filter(
        (e) => e.apiKey.trim() && e.baseURL.trim() && e.model.trim(),
      );
      const body = {
        prompt,
        endpoints: validEndpoints.length ? validEndpoints : undefined,
      };
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError({
          message: data?.error || `HTTP ${res.status}`,
          quotaExceeded: data?.quotaExceeded === true,
          defaultQuota: data?.defaultQuota,
        });
        if (data?.defaultQuota) setDefaultQuota(data.defaultQuota);
        return;
      }
      const ok = data as GenerateResponse;
      setResults(ok.results);
      setSource(ok.source);
      if (ok.defaultQuota) setDefaultQuota(ok.defaultQuota);
      await refreshTracks();
    } catch (err) {
      setGenError({ message: err instanceof Error ? err.message : String(err) });
    } finally {
      setGenerating(false);
    }
  }, [prompt, endpoints, refreshTracks]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
        await refreshTracks();
      } catch (err) {
        console.error(err);
      }
    },
    [refreshTracks],
  );

  const handlePickTrack = useCallback((t: Track) => {
    setPrompt(t.prompt);
    setResults([
      {
        endpointId: 'history',
        endpointName: t.endpoint_name + ' (history)',
        model: t.model,
        ok: true,
        code: t.code,
      },
    ]);
    setSource(null);
  }, []);

  const usingDefault = endpoints.length === 0 || !endpoints.some((e) => e.apiKey.trim());

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <h1 className="font-semibold">any_llm_to_music</h1>
          <span className="text-xs text-muted ml-2">LLM → Strudel → Audio</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {usingDefault ? (
              <>
                使用官方默认接口
                {defaultQuota && (
                  <>
                    {' · '}
                    今日 {defaultQuota.used}/{defaultQuota.limit}
                  </>
                )}
              </>
            ) : (
              <>{endpoints.length} 个自定义接口</>
            )}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            ⚙ Settings
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
            {usingDefault
              ? '尚未配置自定义接口，将调用官方默认接口（每日 100 次共享额度）。'
              : `将同时调用 ${endpoints.filter((e) => e.apiKey.trim()).length} 个自定义接口并分别生成。`}
          </p>
          {genError && (
            <div
              className={`text-xs rounded p-2 whitespace-pre-wrap break-words border ${
                genError.quotaExceeded
                  ? 'text-amber-200 bg-amber-500/10 border-amber-500/40'
                  : 'text-red-300 bg-red-500/10 border-red-500/30'
              }`}
            >
              {genError.message}
              {genError.quotaExceeded && (
                <div className="mt-1 text-amber-300/80">
                  → 在 ⚙ Settings 中添加你的 AI 接口即可继续使用。
                </div>
              )}
            </div>
          )}
          <div className="mt-2 flex-1 min-h-0 flex flex-col">
            <HistoryList
              tracks={tracks}
              onPick={handlePickTrack}
              onDelete={handleDelete}
              loading={tracksLoading}
            />
          </div>
        </aside>

        <section className="p-4 overflow-y-auto scrollbar-thin">
          {results.length === 0 ? (
            <EmptyState usingDefault={usingDefault} configured={endpoints.length} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-muted">
                {source === 'default' && '本次由官方默认接口生成。'}
                {source === 'user' &&
                  `本次由 ${results.length} 个自定义接口并发生成（每个接口对应一个音乐结果）。`}
                <span className="ml-2 text-muted/70">
                  注意：Strudel 引擎是全局单例，同一时间只能播放一个面板。
                </span>
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

function EmptyState({ usingDefault, configured }: { usingDefault: boolean; configured: number }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-md text-center text-sm text-muted border border-dashed border-border rounded-lg p-8">
        <div className="text-3xl mb-2">🎼</div>
        <p className="mb-2">
          {usingDefault
            ? '直接在左侧输入想要的音乐风格，点击 Generate 即可。'
            : `已配置 ${configured} 个接口，点击 Generate 后将并发调用，并分别展示生成结果。`}
        </p>
        <p className="text-xs text-muted/70">
          想用自己的接口？打开右上角 ⚙ Settings 添加 名称 / Base URL / API Key / Model。
        </p>
      </div>
    </div>
  );
}
