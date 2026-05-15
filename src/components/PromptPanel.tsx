'use client';

import { Button } from './ui/Button';

interface Props {
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
  disabled: boolean;
}

const SAMPLES = [
  'lo-fi hip hop with kick, snare, hi-hats and a mellow piano chord',
  'fast techno with acid bass and 4 on the floor',
  'gentle ambient pad in C minor',
  'jazzy walking bass with brushed drums',
];

export function PromptPanel({ prompt, onPromptChange, onGenerate, loading, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs uppercase tracking-wide text-muted">Describe your music</label>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="e.g. lo-fi hip hop with mellow piano chord"
        rows={6}
        className="bg-panel2 border border-border rounded-md p-3 text-sm font-mono focus:outline-none focus:border-accent resize-none"
      />
      <div className="flex flex-wrap gap-1">
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            className="text-xs px-2 py-1 rounded border border-border bg-panel2 hover:bg-border text-muted"
            onClick={() => onPromptChange(s)}
          >
            {s.length > 40 ? s.slice(0, 40) + '…' : s}
          </button>
        ))}
      </div>
      <Button onClick={onGenerate} disabled={disabled || loading || !prompt.trim()}>
        {loading ? 'Generating…' : 'Generate'}
      </Button>
    </div>
  );
}
