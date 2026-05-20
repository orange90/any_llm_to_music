import type { Metadata } from 'next';
import './globals.css';
import { PreferencesProvider } from '@/components/PreferencesProvider';

export const metadata: Metadata = {
  title: 'any_llm_to_music',
  description: 'Generate Strudel music patterns with any LLM and play them in your browser.',
};

const themeInitScript = `
(function(){
  try {
    var raw = localStorage.getItem('any_llm_to_music.preferences.v1');
    var mode = 'system';
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && (parsed.theme === 'dark' || parsed.theme === 'light' || parsed.theme === 'system')) {
        mode = parsed.theme;
      }
    }
    var resolved = mode;
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.classList.remove('dark','light');
    root.classList.add(resolved);
    root.dataset.theme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-bg text-text min-h-screen">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
