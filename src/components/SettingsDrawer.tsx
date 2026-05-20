'use client';

import { useEffect, useState } from 'react';
import type { ClientEndpoint, TestEndpointResponse } from '@/types';
import { Button } from './ui/Button';
import { makeEmptyEndpoint } from '@/hooks/useEndpoints';
import { usePrefs } from './PreferencesProvider';
import type { Language, ThemeMode } from '@/hooks/usePreferences';

interface Props {
  open: boolean;
  onClose: () => void;
  endpoints: ClientEndpoint[];
  onSave: (next: ClientEndpoint[]) => void;
  onClear: () => void;
}

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; latencyMs?: number; reply?: string }
  | { status: 'fail'; message: string };

export function SettingsDrawer({ open, onClose, endpoints, onSave, onClear }: Props) {
  const { prefs, setTheme, setLanguage, t } = usePrefs();
  const [draft, setDraft] = useState<ClientEndpoint[]>(endpoints);
  const [tests, setTests] = useState<Record<string, TestState>>({});

  useEffect(() => {
    if (open) {
      setDraft(endpoints);
      setTests({});
    }
  }, [open, endpoints]);

  if (!open) return null;

  function update(id: string, field: keyof ClientEndpoint, value: string) {
    setDraft((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    setTests((prev) => ({ ...prev, [id]: { status: 'idle' } }));
  }

  function addEndpoint() {
    setDraft((prev) => [...prev, makeEmptyEndpoint()]);
  }

  function removeEndpoint(id: string) {
    setDraft((prev) => prev.filter((e) => e.id !== id));
    setTests((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function testEndpoint(ep: ClientEndpoint) {
    if (!ep.baseURL.trim() || !ep.apiKey.trim() || !ep.model.trim()) {
      setTests((prev) => ({
        ...prev,
        [ep.id]: { status: 'fail', message: t.fillFirst },
      }));
      return;
    }
    setTests((prev) => ({ ...prev, [ep.id]: { status: 'testing' } }));
    try {
      const res = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: ep.baseURL.trim(),
          apiKey: ep.apiKey.trim(),
          model: ep.model.trim(),
        }),
      });
      const data = (await res.json()) as TestEndpointResponse;
      if (data.ok) {
        setTests((prev) => ({
          ...prev,
          [ep.id]: { status: 'ok', latencyMs: data.latencyMs, reply: data.reply },
        }));
      } else {
        setTests((prev) => ({
          ...prev,
          [ep.id]: { status: 'fail', message: data.message || `HTTP ${res.status}` },
        }));
      }
    } catch (err) {
      setTests((prev) => ({
        ...prev,
        [ep.id]: {
          status: 'fail',
          message: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  }

  function renderTestState(id: string) {
    const st = tests[id];
    if (!st || st.status === 'idle') return null;
    if (st.status === 'testing') {
      return <span className="text-xs text-muted">{t.testing}</span>;
    }
    if (st.status === 'ok') {
      return (
        <span className="text-xs text-accent2">
          ✓ {t.testPassed} {st.latencyMs != null ? `(${st.latencyMs}ms)` : ''}
          {st.reply ? ` · ${t.testReply}: ${truncate(st.reply, 40)}` : ''}
        </span>
      );
    }
    return (
      <span className="text-xs text-red-400 dark:text-red-300 break-all">
        ✗ {truncate(st.message, 200)}
      </span>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/30 dark:bg-black/60"
        onClick={onClose}
      />
      <aside className="w-full max-w-lg bg-panel border-l border-border h-full overflow-y-auto p-6 flex flex-col gap-4 scrollbar-thin">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.drawerTitle}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text"
            aria-label={t.drawerClose}
          >
            ✕
          </button>
        </div>

        <section className="border border-border rounded-md p-3 flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t.sectionLanguage}</h3>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {(
                [
                  { value: 'en', label: 'English' },
                  { value: 'zh', label: '中文' },
                ] as Array<{ value: Language; label: string }>
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={`flex-1 text-xs h-8 rounded border px-2 transition-colors ${
                    prefs.language === opt.value
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted/80 mt-1">{t.languageHint}</p>
          </div>
        </section>

        <section className="border border-border rounded-md p-3 flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t.sectionAppearance}</h3>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">{t.themeLabel}</label>
            <div className="flex gap-1">
              {(
                [
                  { value: 'system', label: t.themeSystem },
                  { value: 'light', label: t.themeLight },
                  { value: 'dark', label: t.themeDark },
                ] as Array<{ value: ThemeMode; label: string }>
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 text-xs h-8 rounded border px-2 transition-colors ${
                    prefs.theme === opt.value
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted/80 mt-1">{t.themeHint}</p>
          </div>
        </section>

        <div className="flex items-center justify-between mt-2">
          <h3 className="text-sm font-semibold">{t.sectionEndpoints}</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          {t.endpointsIntro1}
          <br />
          {t.endpointsIntro2}
          <br />
          {t.endpointsIntro3}
        </p>

        {draft.length === 0 ? (
          <div className="text-xs text-muted border border-dashed border-border rounded-md p-4 text-center">
            {t.endpointEmpty}
          </div>
        ) : (
          draft.map((ep, idx) => (
            <fieldset
              key={ep.id}
              className="border border-border rounded-md p-3 flex flex-col gap-2"
            >
              <legend className="text-xs uppercase tracking-wide text-muted px-1">
                {t.endpointIndex(idx + 1)}
              </legend>

              <label className="text-xs text-muted">{t.fieldName}</label>
              <input
                type="text"
                value={ep.name}
                onChange={(e) => update(ep.id, 'name', e.target.value)}
                placeholder={t.fieldNamePlaceholder}
                className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
              />

              <label className="text-xs text-muted">{t.fieldBaseURL}</label>
              <input
                type="text"
                value={ep.baseURL}
                onChange={(e) => update(ep.id, 'baseURL', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
              />

              <label className="text-xs text-muted">{t.fieldAPIKey}</label>
              <input
                type="password"
                value={ep.apiKey}
                onChange={(e) => update(ep.id, 'apiKey', e.target.value)}
                placeholder="sk-…"
                className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
                autoComplete="new-password"
              />

              <label className="text-xs text-muted">{t.fieldModel}</label>
              <input
                type="text"
                value={ep.model}
                onChange={(e) => update(ep.id, 'model', e.target.value)}
                placeholder="gpt-4o-mini / claude-3-5-sonnet-latest / deepseek-chat"
                className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
              />

              <div className="flex items-center gap-2 mt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => testEndpoint(ep)}
                  disabled={tests[ep.id]?.status === 'testing'}
                >
                  {tests[ep.id]?.status === 'testing' ? t.testing : t.test}
                </Button>
                <button
                  type="button"
                  onClick={() => removeEndpoint(ep.id)}
                  className="text-xs text-muted hover:text-red-400 ml-auto"
                >
                  {t.deleteEndpoint}
                </button>
              </div>
              <div className="min-h-[1rem]">{renderTestState(ep.id)}</div>
            </fieldset>
          ))
        )}

        <Button variant="secondary" onClick={addEndpoint}>
          {t.addEndpoint}
        </Button>

        <div className="flex gap-2 mt-2">
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            {t.save}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          {draft.length > 0 && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(t.clearConfirm)) {
                  onClear();
                  setDraft([]);
                }
              }}
              className="ml-auto"
            >
              {t.clearAll}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}
