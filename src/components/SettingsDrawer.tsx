'use client';

import { useEffect, useState } from 'react';
import type { ProviderId, UserKeys } from '@/types';
import { Button } from './ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  keys: UserKeys;
  onSave: (next: UserKeys) => void;
  onClear: () => void;
}

const PROVIDERS: { id: ProviderId; label: string; defaultBase?: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openrouter', label: 'OpenRouter', defaultBase: 'https://openrouter.ai/api/v1' },
];

export function SettingsDrawer({ open, onClose, keys, onSave, onClear }: Props) {
  const [draft, setDraft] = useState<UserKeys>(keys);

  useEffect(() => {
    if (open) setDraft(keys);
  }, [open, keys]);

  if (!open) return null;

  function update(id: ProviderId, field: 'apiKey' | 'baseURL', value: string) {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <aside className="w-full max-w-md bg-panel border-l border-border h-full overflow-y-auto p-6 flex flex-col gap-4 scrollbar-thin">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="text-xs text-muted">
          API keys you enter here are stored ONLY in your browser&apos;s localStorage and forwarded to this server
          per-request. Server-side <code className="text-accent">.env</code> values are used when no override is set.
        </p>

        {PROVIDERS.map((p) => (
          <fieldset key={p.id} className="border border-border rounded-md p-3 flex flex-col gap-2">
            <legend className="text-xs uppercase tracking-wide text-muted px-1">{p.label}</legend>
            <label className="text-xs text-muted">API Key</label>
            <input
              type="password"
              value={draft[p.id]?.apiKey ?? ''}
              onChange={(e) => update(p.id, 'apiKey', e.target.value)}
              placeholder="sk-…"
              className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
              autoComplete="new-password"
            />
            <label className="text-xs text-muted">Base URL (optional)</label>
            <input
              type="text"
              value={draft[p.id]?.baseURL ?? ''}
              onChange={(e) => update(p.id, 'baseURL', e.target.value)}
              placeholder={p.defaultBase ?? 'https://…'}
              className="bg-panel2 border border-border rounded h-9 px-2 text-sm focus:outline-none focus:border-accent"
            />
          </fieldset>
        ))}

        <div className="flex gap-2 mt-2">
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onClear} className="ml-auto">
            Clear all
          </Button>
        </div>
      </aside>
    </div>
  );
}
