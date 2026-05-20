'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'dark' | 'light';
export type Language = 'en' | 'zh';

export interface Preferences {
  theme: ThemeMode;
  language: Language;
}

const STORAGE_KEY = 'any_llm_to_music.preferences.v1';

const DEFAULTS: Preferences = {
  theme: 'system',
  language: 'en',
};

function readFromStorage(): Preferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      theme:
        parsed.theme === 'dark' || parsed.theme === 'light' || parsed.theme === 'system'
          ? parsed.theme
          : DEFAULTS.theme,
      language: parsed.language === 'zh' || parsed.language === 'en' ? parsed.language : DEFAULTS.language,
    };
  } catch {
    return DEFAULTS;
  }
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'dark' || mode === 'light') return mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  root.dataset.theme = resolved;
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const initial = readFromStorage();
    setPrefs(initial);
    applyTheme(initial.theme);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    applyTheme(prefs.theme);
    if (prefs.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefs.theme, loaded]);

  const update = useCallback((next: Partial<Preferences>) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
      return merged;
    });
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => update({ theme }), [update]);
  const setLanguage = useCallback((language: Language) => update({ language }), [update]);

  return { prefs, setTheme, setLanguage, loaded };
}
