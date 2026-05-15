'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProviderInfo, ProviderId, Track, UserKeys } from '@/types';
import { PromptPanel } from '@/components/PromptPanel';
import { ModelSelector } from '@/components/ModelSelector';
import { CodeEditor } from '@/components/CodeEditor';
import { StrudelPlayer } from '@/components/StrudelPlayer';
import { HistoryList } from '@/components/HistoryList';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { Button } from '@/components/ui/Button';
import { useLocalKeys, serializeKeysHeader } from '@/hooks/useLocalKeys';

export default function HomePage() {
  const { keys, save, clear, loaded } = useLocalKeys();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerId, setProviderId] = useState<ProviderId | ''>('');
  const [model, setModel] = useState('');

  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const refreshProviders = useCallback(
    async (opts?: { keysOverride?: UserKeys; preferProvider?: ProviderId }) => {
      const effectiveKeys = opts?.keysOverride ?? keys;
      try {
        const res = await fetch('/api/models', {
          headers: { 'x-user-keys': serializeKeysHeader(effectiveKeys) },
        });
        const data = (await res.json()) as { providers: ProviderInfo[] };
        setProviders(data.providers);

        const preferred =
          opts?.preferProvider &&
          data.providers.find((p) => p.id === opts.preferProvider && p.configured);
        if (preferred) {
          setProviderId(preferred.id);
          setModel(preferred.defaultModel);
          return;
        }

        if (!providerId) {
          const first = data.providers.find((p) => p.configured);
          if (first) {
            setProviderId(first.id);
            setModel(first.defaultModel);
          }
        } else {
          const current = data.providers.find((p) => p.id === providerId);
          if (current && !current.configured) {
            const first = data.providers.find((p) => p.configured);
            setProviderId(first?.id ?? '');
            setModel(first?.defaultModel ?? '');
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    [keys, providerId],
  );

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
    refreshProviders();
    refreshTracks();
  }, [loaded, refreshProviders, refreshTracks]);

  const configuredCount = useMemo(() => providers.filter((p) => p.configured).length, [providers]);

  const handleGenerate = useCallback(async () => {
    if (!providerId || !model || !prompt.trim()) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: providerId, model, userKeys: keys }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setCode(data.code);
      await refreshTracks();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }, [providerId, model, prompt, keys, refreshTracks]);

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
    setCode(t.code);
    setProviderId(t.provider);
    setModel(t.model);
  }, []);

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <h1 className="font-semibold">any_llm_to_music</h1>
          <span className="text-xs text-muted ml-2">LLM → Strudel → Audio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {configuredCount === 0 ? 'No provider configured' : `${configuredCount} provider(s) ready`}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            ⚙ Settings
          </Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[360px_1fr] overflow-hidden">
        <aside className="border-r border-border bg-panel p-4 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
          <ModelSelector
            providers={providers}
            providerId={providerId}
            model={model}
            onChange={(pid, m) => {
              setProviderId(pid);
              setModel(m);
            }}
          />
          <PromptPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            onGenerate={handleGenerate}
            loading={generating}
            disabled={!providerId || !model}
          />
          {genError && (
            <pre className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2 whitespace-pre-wrap break-words">
              {genError}
            </pre>
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

        <section className="p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 min-h-0">
            <CodeEditor code={code} onChange={setCode} />
          </div>
          <div className="border-t border-border pt-3">
            <StrudelPlayer code={code} />
          </div>
        </section>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        keys={keys}
        onSave={(next) => {
          save(next);
          const newlyAdded = (['anthropic', 'openai', 'openrouter'] as ProviderId[]).find(
            (id) => !!next[id]?.apiKey?.trim() && !keys[id]?.apiKey?.trim(),
          );
          refreshProviders({ keysOverride: next, preferProvider: newlyAdded });
        }}
        onClear={() => {
          clear();
          refreshProviders({ keysOverride: {} });
        }}
      />
    </main>
  );
}
