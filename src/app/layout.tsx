import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'any_llm_to_music',
  description: 'Generate Strudel music patterns with any LLM and play them in your browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen">{children}</body>
    </html>
  );
}
