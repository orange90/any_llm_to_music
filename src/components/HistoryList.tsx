'use client';

import type { Track } from '@/types';

interface Props {
  tracks: Track[];
  onPick: (t: Track) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function HistoryList({ tracks, onPick, onDelete, loading }: Props) {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs uppercase tracking-wide text-muted">History</h3>
        {loading && <span className="text-xs text-muted">loading…</span>}
      </div>
      {tracks.length === 0 ? (
        <div className="text-xs text-muted py-4 text-center">No tracks yet. Generate one!</div>
      ) : (
        tracks.map((t) => (
          <div
            key={t.id}
            className="group flex items-start gap-2 p-2 rounded border border-border bg-panel2 hover:bg-border cursor-pointer"
            onClick={() => onPick(t)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{t.title}</div>
              <div className="text-xs text-muted truncate">
                {t.provider} · {t.model} · {new Date(t.created_at).toLocaleString()}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(t.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 text-xs"
              aria-label="Delete"
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}
