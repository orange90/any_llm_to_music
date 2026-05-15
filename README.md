# any_llm_to_music

> Use any LLM (Anthropic, OpenAI, OpenRouter, …) to generate **[Strudel](https://strudel.cc)** music patterns and play them right in your browser.

![flow](https://img.shields.io/badge/flow-prompt%20%E2%86%92%20LLM%20%E2%86%92%20Strudel%20%E2%86%92%20audio-7c5cff)

## Features

- 🎛 **Multi-provider**: Anthropic, OpenAI, OpenRouter (any OpenAI-compatible base URL).
- 🔐 **Two key sources**: server-side `.env` (recommended for prod) + per-browser overrides stored in `localStorage`.
- 🎹 **In-browser playback** via `@strudel/web` (real Strudel engine — not an iframe).
- 💾 **History** of generated patterns persisted in local SQLite.
- 🧪 Editable code panel with syntax highlight; click to manually tweak then play.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure
cp .env.example .env.local
# edit .env.local and put at least one of ANTHROPIC_API_KEY / OPENAI_API_KEY / OPENROUTER_API_KEY
# (or skip this and supply the keys via the in-app Settings drawer)

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

> You **must click Play** for audio to start (browser autoplay policy). The first Play also downloads the dirt-samples library from GitHub — give it a few seconds.

## Environment variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Server-side key for Anthropic |
| `OPENAI_API_KEY` | Server-side key for OpenAI |
| `OPENROUTER_API_KEY` | Server-side key for OpenRouter |
| `ANTHROPIC_DEFAULT_MODEL` / `OPENAI_DEFAULT_MODEL` / `OPENROUTER_DEFAULT_MODEL` | Default model id displayed in UI |
| `OPENAI_BASE_URL` / `OPENROUTER_BASE_URL` | Override base URL (self-hosted gateways) |
| `DATABASE_PATH` | SQLite file path (default `data/app.db`) |

Per-request priority: **user override (localStorage) → server `.env` → error**.

## How it works

```
Browser  ─prompt─►  /api/generate  ─►  provider SDK  ─►  LLM
   ▲                                          │
   │                                          ▼
   └──Strudel code──◄ extract ```js code block`
   │
   ▼  click ▶ Play
@strudel/web .evaluate(code)  →  Web Audio
```

- The system prompt teaches the LLM the Strudel mini-notation and a few example patterns (see `src/lib/prompt.ts`).
- Generated code is required to be a single \`\`\`javascript fenced block; the host calls `evaluate` and `hush` itself, so the LLM never has to.

## Project layout

```
src/
├── app/
│   ├── page.tsx                # main UI
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── models/route.ts     # GET providers + models
│       ├── generate/route.ts   # POST prompt → code
│       └── tracks/             # CRUD on history
├── components/                 # React UI
├── hooks/                      # useStrudel, useLocalKeys
├── lib/
│   ├── db.ts                   # better-sqlite3 + migrations
│   ├── env.ts                  # provider config + cred resolution
│   ├── prompt.ts               # system prompt
│   ├── providers/              # anthropic / openai / openrouter
│   └── strudel/extractCode.ts
└── types/index.ts
```

## Security notes

- Keys saved via the **Settings** drawer live in your browser's `localStorage` and are sent to this server with each generate request. They are **never written to the database**. Be mindful on shared machines.
- Prefer server-side `.env` keys for production deployments.

## Deployment

`better-sqlite3` is a native module and requires the Node.js runtime (not Edge). On Vercel, route handlers default to `runtime = 'nodejs'` (already set).

## Troubleshooting

- **"No API key configured"** → Open Settings and enter a key, or set it in `.env.local` and restart the dev server.
- **No sound on Play** → Click Play once more; ensure your output device is up; check browser console for Strudel errors (they will surface in the player error box too).
- **Slow first Play** → dirt-samples are being fetched from GitHub. Subsequent plays are cached.
- **Generated code throws** → Click the code panel to edit, fix manually, or re-prompt the LLM with the error.

## License

MIT.
