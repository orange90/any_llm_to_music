'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProviderInfo } from '@/types';

interface Props {
  providers: ProviderInfo[];
  providerId: ProviderInfo['id'] | '';
  model: string;
  onChange: (provider: ProviderInfo['id'], model: string) => void;
}

export function ModelSelector({ providers, providerId, model, onChange }: Props) {
  const current = providers.find((p) => p.id === providerId);
  const models = useMemo(() => current?.models ?? [], [current]);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setQuery('');
  }, [providerId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, providerId]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const commit = (m: string) => {
    if (!current) return;
    onChange(current.id, m);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const choice = filtered[activeIdx];
      if (choice) commit(choice);
      else if (query.trim()) commit(query.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-wide text-muted">Provider</label>
      <select
        className="bg-panel2 border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:border-accent"
        value={providerId}
        onChange={(e) => {
          const nextId = e.target.value as ProviderInfo['id'];
          const next = providers.find((p) => p.id === nextId);
          onChange(nextId, next?.defaultModel ?? '');
        }}
      >
        <option value="">Select a provider…</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.configured}>
            {p.label}
            {!p.configured ? ' (no key)' : p.source === 'user' ? ' · user key' : ' · env key'}
          </option>
        ))}
      </select>

      <label className="text-xs uppercase tracking-wide text-muted mt-2">
        Model {current && <span className="text-muted/60 normal-case">({models.length} available)</span>}
      </label>
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          className="w-full bg-panel2 border border-border rounded-md h-10 px-3 pr-8 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
          disabled={!current}
          placeholder={current ? 'Search or type a model id…' : 'Select a provider first'}
          value={open || query ? query : model}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {current && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((o) => !o)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text text-xs"
            aria-label="Toggle model list"
          >
            ▾
          </button>
        )}

        {open && current && (
          <ul
            ref={listRef}
            className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto scrollbar-thin bg-panel2 border border-border rounded-md shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">
                No matches. Press Enter to use “{query.trim()}”.
              </li>
            ) : (
              filtered.map((m, i) => (
                <li
                  key={m}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    i === activeIdx ? 'bg-border' : 'hover:bg-border/60'
                  } ${m === model ? 'text-accent' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(m);
                  }}
                >
                  {m}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
