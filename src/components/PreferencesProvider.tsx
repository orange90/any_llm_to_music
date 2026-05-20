'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePreferences, type Language, type ThemeMode, type Preferences } from '@/hooks/usePreferences';
import { getStrings, type Strings } from '@/lib/i18n';

interface PreferencesContextValue {
  prefs: Preferences;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: Language) => void;
  loaded: boolean;
  t: Strings;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const inner = usePreferences();
  const t = useMemo(() => getStrings(inner.prefs.language), [inner.prefs.language]);
  const value: PreferencesContextValue = { ...inner, t };
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePrefs(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePrefs must be used within a PreferencesProvider');
  }
  return ctx;
}
