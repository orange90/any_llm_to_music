'use client';

import { useEffect, useState } from 'react';
import type { ClientEndpoint, TestEndpointResponse } from '@/types';
import { Button } from './ui/Button';
import { makeEmptyEndpoint } from '@/hooks/useEndpoints';

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
        [ep.id]: { status: 'fail', message: '请先填完整 Base URL / API Key / Model。' },
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
    const t = tests[id];
    if (!t || t.status === 'idle') return null;
    if (t.status === 'testing') {
      return <span className="text-xs text-muted">测试中…</span>;
    }
    if (t.status === 'ok') {
      return (
        <span className="text-xs text-accent2">
          ✓ 通过 {t.latencyMs != null ? `(${t.latencyMs}ms)` : ''}
          {t.reply ? ` · 回应: ${truncate(t.reply, 40)}` : ''}
        </span>
      );
    }
    return (
      <span className="text-xs text-red-300 break-all">✗ {truncate(t.message, 200)}</span>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <aside className="w-full max-w-lg bg-panel border-l border-border h-full overflow-y-auto p-6 flex flex-col gap-4 scrollbar-thin">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">AI 接口设置</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          这里配置的接口仅保存在浏览器 <code className="text-accent">localStorage</code> 中，
          每次生成时随请求转发到本服务器。<br />
          只要你配置了任意一个接口，就不会再调用官方默认接口；<strong>有几个接口就会同时生成几个音乐</strong>。
          每个接口旁边的 <span className="text-accent">Test</span> 按钮可以用最低成本验证接口是否能跑通。
        </p>

        {draft.length === 0 ? (
          <div className="text-xs text-muted border border-dashed border-border rounded-md p-4 text-center">
            还没有自定义接口。点击下方 “+ 新增接口” 来添加。<br />
            未添加时将使用官方默认接口（每天最多 100 次）。
          </div>
        ) : (
          draft.map((ep, idx) => (
            <fieldset
              key={ep.id}
              className="border border-border rounded-md p-3 flex flex-col gap-2"
            >
              <legend className="text-xs uppercase tracking-wide text-muted px-1">
                接口 #{idx + 1}
              </legend>

              <label className="text-xs text-muted">名称</label>
              <input
                type="text"
                value={ep.name}
                onChange={(e) => update(ep.id, 'name', e.target.value)}
                placeholder="例如: My OpenAI / DeepSeek 主号 / OpenRouter Claude"
                className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
              />

              <label className="text-xs text-muted">Base URL</label>
              <input
                type="text"
                value={ep.baseURL}
                onChange={(e) => update(ep.id, 'baseURL', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
              />

              <label className="text-xs text-muted">API Key</label>
              <input
                type="password"
                value={ep.apiKey}
                onChange={(e) => update(ep.id, 'apiKey', e.target.value)}
                placeholder="sk-…"
                className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
                autoComplete="new-password"
              />

              <label className="text-xs text-muted">Model</label>
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
                  {tests[ep.id]?.status === 'testing' ? 'Testing…' : 'Test'}
                </Button>
                <button
                  type="button"
                  onClick={() => removeEndpoint(ep.id)}
                  className="text-xs text-muted hover:text-red-400 ml-auto"
                >
                  删除接口
                </button>
              </div>
              <div className="min-h-[1rem]">{renderTestState(ep.id)}</div>
            </fieldset>
          ))
        )}

        <Button variant="secondary" onClick={addEndpoint}>
          ＋ 新增接口
        </Button>

        <div className="flex gap-2 mt-2">
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            保存
          </Button>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          {draft.length > 0 && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('清空所有接口？将回退到使用官方默认接口。')) {
                  onClear();
                  setDraft([]);
                }
              }}
              className="ml-auto"
            >
              全部清空
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
