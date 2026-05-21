# any_llm_to_music

**English** | [简体中文](./README.zh-CN.md)

> Use any OpenAI-compatible LLM to generate **[Strudel](https://strudel.cc)** music patterns and play them right in your browser.

![flow](https://img.shields.io/badge/flow-prompt%20%E2%86%92%20LLM(s)%20%E2%86%92%20Strudel%20%E2%86%92%20audio-7c5cff)

## Features

- 🆓 **Default endpoint out of the box** — server-side default LLM with a daily quota (default 100/day, shared across all visitors). When exhausted, the UI surfaces a quota-exceeded message prompting you to plug in your own API.
- 🔌 **Bring your own endpoints** — add as many OpenAI-compatible AI endpoints as you like in Settings. Each endpoint is just four fields: **Name / Base URL / API Key / Model**.
- 🧪 **One-click `Test`** on every endpoint — sends a tiny `ping → pong` round-trip to verify connectivity, model availability and key validity at the lowest possible cost.
- 🎼 **Multi-endpoint parallel generation** — when you have N user endpoints configured, every Generate runs all N concurrently and renders **N independent music panels**, each with its own code editor and play/stop.
- 🎹 **In-browser playback** via `@strudel/web` (real Strudel engine — not an iframe).
- 💾 **History** of generated patterns persisted in local SQLite.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure (optional — only needed if you want the built-in default endpoint)
cp .env.example .env.local
# edit .env.local and fill in DEFAULT_LLM_*  (see below)

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

> You **must click Play** for audio to start (browser autoplay policy). The first Play also downloads the dirt-samples library from GitHub — give it a few seconds.

## How keys are resolved

Per-request priority is simple:

```
user has any valid endpoint configured in Settings  →  use those (parallel)
                       otherwise                    →  use the default endpoint (if set)
                                otherwise           →  error
```

The two paths are **mutually exclusive**: as long as you have at least one valid user endpoint, the default endpoint is never called and the daily quota is not consumed.

## Environment variables

The default endpoint is a single OpenAI-compatible chat API:

| Variable | Purpose | Default |
|---|---|---|
| `DEFAULT_LLM_BASE_URL` | OpenAI-compatible base URL | `https://api.openai.com/v1` |
| `DEFAULT_LLM_API_KEY` | API key for the default endpoint | _empty → default endpoint disabled_ |
| `DEFAULT_LLM_MODEL` | Model id used by the default endpoint | `gpt-4o-mini` |
| `DEFAULT_LLM_DAILY_LIMIT` | Max calls/day across all visitors (UTC day) | `100` |
| `DATABASE_PATH` | SQLite file path | `data/app.db` |

If any of `DEFAULT_LLM_BASE_URL`/`DEFAULT_LLM_API_KEY`/`DEFAULT_LLM_MODEL` is empty, the default endpoint is considered **not configured** — users will need their own endpoints in Settings.

The daily counter is persisted in SQLite (`default_llm_usage` table, keyed by UTC date), so it survives restarts and resets at UTC midnight.

## Settings: per-endpoint configuration

Each endpoint in Settings has only four fields and is stored ONLY in your browser's `localStorage`:

| Field | Example |
|---|---|
| Name | `My OpenAI`, `DeepSeek main`, `OpenRouter Claude` |
| Base URL | `https://api.openai.com/v1` |
| API Key | `sk-…` |
| Model | `gpt-4o-mini`, `deepseek-chat`, `anthropic/claude-3.5-sonnet` |

Click **`+ Add endpoint`** to add another endpoint, click **`Test`** to verify it.

> Because all endpoints share one OpenAI-compatible code path, native Anthropic API (which uses `x-api-key` + `/v1/messages`) is not directly supported. Use Anthropic's OpenAI-compatible gateway, OpenRouter, or any other compatible proxy.

## How it works

```
Browser  ─prompt + endpoints[]─►  /api/generate
                                     │
                                     ▼
                  ┌──────────────────┴──────────────────┐
                  │                                     │
       endpoints?  yes                                  no
                  │                                     │
                  ▼                                     ▼
   Promise.all(call each endpoint)        check daily quota → call default
                  │                                     │
                  └──────► EndpointGenerateResult[] ◄───┘
                                     │
                                     ▼
                          extract ```js fenced code block
                                     │
   Browser  ◄── render N panels (1 per endpoint result)
                                     │
                       click ▶ Play  →  @strudel/web .evaluate(code)  →  Web Audio
```

- The system prompt teaches the LLM the Strudel mini-notation and a few example patterns (`src/lib/prompt.ts`).
- Generated code must be a single \`\`\`javascript fenced block; the host calls `evaluate` and `hush` itself, so the LLM never has to.
- A separate `/api/test-endpoint` route powers the in-Settings **Test** button; it sends an 8-token `ping` request asking for `pong`.

> Note: `@strudel/web` exposes a **single global engine**. Even though you may see multiple result panels, only one can sound at a time — pressing Play on a different panel replaces the global cycle.

## Project layout

```
src/
├── app/
│   ├── page.tsx                       # main UI (multi-panel results)
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── generate/route.ts          # POST prompt[+endpoints] → results[]
│       ├── test-endpoint/route.ts     # POST {baseURL,apiKey,model} → ping/pong
│       └── tracks/                    # CRUD on history
├── components/
│   ├── EndpointResultPanel.tsx        # one card per endpoint result
│   ├── SettingsDrawer.tsx             # endpoints list + Test buttons
│   ├── PromptPanel.tsx
│   ├── HistoryList.tsx
│   ├── CodeEditor.tsx
│   ├── StrudelPlayer.tsx
│   └── ui/Button.tsx
├── hooks/
│   ├── useEndpoints.ts                # localStorage v2 + legacy migration
│   └── useStrudel.ts
├── lib/
│   ├── llmClient.ts                   # OpenAI-compatible chatComplete + chatPing
│   ├── env.ts                         # default LLM config + helpers
│   ├── db.ts                          # tracks + default_llm_usage repos
│   ├── prompt.ts
│   └── strudel/extractCode.ts
└── types/index.ts
```

## Security notes

- Endpoints saved via Settings live in your browser's `localStorage` and are forwarded to this server with each generate request. They are **never written to the database**. Be mindful on shared machines.
- The default endpoint's key (`DEFAULT_LLM_API_KEY`) lives only on the server.
- The daily quota is a soft sharing limit — there is **no per-user identity**. A trusted abuser could easily drain it. Keep it modest, and rely on user-supplied keys for any real workload.

## Deployment

`better-sqlite3` is a native module and requires the Node.js runtime (not Edge). On Vercel, route handlers default to `runtime = 'nodejs'` (already set).

## Migrating from previous versions

- The old `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `OPENROUTER_API_KEY` env vars are gone — replace them with a single `DEFAULT_LLM_*` set, or skip the default and use Settings.
- The old per-provider `localStorage` (`any_llm_to_music.userKeys.v1`) is auto-migrated on first load to the new `endpoints.v2` shape (one entry per provider that had a key).
- The `tracks.provider` column has been replaced by `tracks.endpoint_name`; a one-time `ALTER TABLE` migration in `src/lib/db.ts` preserves existing history.

## Troubleshooting

- **Quota-exceeded error from the default endpoint** → today's shared quota is exhausted. Open Settings and add your own endpoint(s).
- **"Default AI endpoint not configured" error** → no `DEFAULT_LLM_*` env vars set and no user endpoints. Either set the env, or add an endpoint in Settings.
- **`Test` fails with 401** → wrong API key or the key has no access to the chosen model.
- **`Test` fails with 404 / "model not found"** → typo in the Model field, or that model isn't served by this Base URL.
- **No sound on Play** → click Play once more; ensure your output device is up; check the player error box and browser console.
- **Slow first Play** → dirt-samples are being fetched from GitHub. Subsequent plays are cached.
- **Generated code throws** → click the code panel to edit, fix manually, or re-prompt.

## License

This project is licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**. See the [LICENSE](./LICENSE) file for the full text.

This project depends on [Strudel](https://strudel.cc/) (`@strudel/web` and related packages), which is itself licensed under AGPL-3.0-or-later. As a result, any distribution or network deployment of this project must comply with the AGPL, including making the corresponding source code available to users who interact with the service over a network.
