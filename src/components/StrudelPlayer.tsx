'use client';

import { Button } from './ui/Button';
import { useStrudel } from '@/hooks/useStrudel';
import { usePrefs } from './PreferencesProvider';

interface Props {
  code: string;
}

export function StrudelPlayer({ code }: Props) {
  const { status, error, play, stop } = useStrudel();
  const { t } = usePrefs();
  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';

  const label =
    status === 'idle'
      ? t.playerReady
      : status === 'loading'
        ? t.playerLoading
        : status === 'ready'
          ? t.playerEngineReady
          : status === 'playing'
            ? t.playerPlaying
            : t.playerError;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => play(code)}
          disabled={!code || isLoading}
          variant={isPlaying ? 'secondary' : 'primary'}
        >
          {t.playerPlay}
        </Button>
        <Button onClick={stop} variant="secondary" disabled={!isPlaying}>
          {t.playerStop}
        </Button>
        <span
          className={`text-xs px-2 py-1 rounded ${
            status === 'error'
              ? 'bg-red-500/20 text-red-500 dark:text-red-300'
              : isPlaying
                ? 'bg-accent2/20 text-accent2'
                : 'bg-panel2 text-muted'
          }`}
        >
          {label}
        </span>
      </div>
      {error && (
        <pre className="text-xs text-red-500 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-auto scrollbar-thin">
          {error}
        </pre>
      )}
      <p className="text-xs text-muted">{t.playerHint}</p>
    </div>
  );
}
