import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        panel: 'var(--color-panel)',
        panel2: 'var(--color-panel2)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
        accent2: 'var(--color-accent2)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        codebg: 'var(--color-code-bg)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
