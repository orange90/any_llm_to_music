'use client';

import type { HistoryEntry } from '@/types';
import { usePrefs } from './PreferencesProvider';

interface Props {
  entries: HistoryEntry[];
  onPick: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

function summarizeEndpoints(entry: HistoryEntry): string {
  const { results } = entry;
  if (results.length === 0) return '';
  if (results.length === 1) {
    return `${results[0].endpointName} · ${results[0].model}`;
  }
  const okCount = results.filter((r) => r.ok).length;
  const names = results.map((r) => r.endpointName).join(', ');
  return `${results.length} endpoints (${okCount} ✓) · ${names}`;
}

export function HistoryList({ entries, onPick, onDelete, loading }: Props) {
  const { t } = usePrefs();
  return (
    <div className="flex flex-col gap-1 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs uppercase tracking-wide text-muted">{t.history}</h3>
        {loading && <span className="text-xs text-muted">{t.historyLoading}</span>}
      </div>
      {entries.length === 0 ? (
        <div className="text-xs text-muted py-4 text-center">{t.historyEmpty}</div>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            className="group flex items-start gap-2 p-2 rounded border border-border bg-panel2 hover:bg-border cursor-pointer"
            onClick={() => onPick(entry)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{entry.title}</div>
              <div className="text-xs text-muted truncate">
                {summarizeEndpoints(entry)}
              </div>
              <div className="text-xs text-muted/70 truncate">
                {new Date(entry.created_at).toLocaleString()}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 text-xs"
              aria-label={t.deleteAria}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}
