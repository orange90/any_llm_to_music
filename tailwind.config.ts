import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        panel: '#121520',
        panel2: '#1a1f2e',
        border: '#242a3a',
        accent: '#7c5cff',
        accent2: '#2ec4b6',
        text: '#e6e8ee',
        muted: '#8a90a2',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
