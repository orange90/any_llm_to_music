# any_llm_to_music

**English** | [简体中文](./README.zh-CN.md)

> Use any OpenAI-compatible LLM to generate **[Strudel](https://strudel.cc)** music patterns and play them right in your browser.

![flow](https://img.shields.io/badge/flow-prompt%20%E2%86%92%20LLM(s)%20%E2%86%92%20Strudel%20%E2%86%92%20audio-7c5cff)

## Demo


https://github.com/user-attachments/assets/ff99441b-6031-433b-a48d-4d38b49ec27d

## Features

- 🆓 **Default endpoint out of the box** — server-side default LLM with an optional daily quota (default 100/day, shared across all visitors, enforced only when an Upstash Redis store is configured). When exhausted, the UI surfaces a quota-exceeded message prompting you to plug in your own API.
- 🔌 **Bring your own endpoints** — add as many OpenAI-compatible AI endpoints as you like in Settings. Each endpoint is just four fields: **Name / Base URL / API Key / Model**.
- 🧪 **One-click `Test`** on every endpoint — sends a tiny `ping → pong` round-trip to verify connectivity, model availability and key validity at the lowest possible cost.
- 🎼 **Multi-endpoint parallel generation** — when you have N user endpoints configured, every Generate runs all N concurrently and renders **N independent music panels**, each with its own code editor and play/stop.
- 🎹 **In-browser playback** via `@strudel/web` (real Strudel engine — not an iframe).
- 💾 **History** of generated patterns persisted in the browser's `localStorage`.

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
| `DEFAULT_LLM_DAILY_LIMIT` | Max calls/day across all visitors (UTC day, only enforced when Redis is configured) | `100` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) | Upstash Redis credentials. When present, the daily counter is persisted in Redis. When absent, the daily quota is **not** enforced. | _unset_ |

If any of `DEFAULT_LLM_BASE_URL`/`DEFAULT_LLM_API_KEY`/`DEFAULT_LLM_MODEL` is empty, the default endpoint is considered **not configured** — users will need their own endpoints in Settings.

When Redis credentials are present, the daily counter is persisted in Redis (`default_llm_usage:<UTC-date>` keys, auto-expiring after 3 days), so it survives restarts and resets at UTC midnight. Without Redis (typical local dev) the default endpoint is unmetered.

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
│       └── test-endpoint/route.ts     # POST {baseURL,apiKey,model} → ping/pong
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
│   ├── usageRepo.ts                   # Upstash Redis daily-quota counter (no-op when unset)
│   ├── prompt.ts
│   └── strudel/extractCode.ts
└── types/index.ts
```

## Security notes

- Endpoints saved via Settings live in your browser's `localStorage` and are forwarded to this server with each generate request. They are **never persisted on the server**. Be mindful on shared machines.
- The default endpoint's key (`DEFAULT_LLM_API_KEY`) lives only on the server.
- The daily quota is a soft sharing limit — there is **no per-user identity**. A trusted abuser could easily drain it. Keep it modest, and rely on user-supplied keys for any real workload.

## Deployment

The route handlers run on the Node.js runtime (`runtime = 'nodejs'`, already set). Deploy to Vercel directly, or self-host with `npm run build && npm start`. See [DEPLOY.md](./DEPLOY.md) for the Vercel + Upstash Redis flow.

## Troubleshooting

- **Quota-exceeded error from the default endpoint** → today's shared quota is exhausted. Open Settings and add your own endpoint(s).
- **"Default AI endpoint not configured" error** → no `DEFAULT_LLM_*` env vars set and no user endpoints. Either set the env, or add an endpoint in Settings.
- **`Test` fails with 401** → wrong API key or the key has no access to the chosen model.
- **`Test` fails with 404 / "model not found"** → typo in the Model field, or that model isn't served by this Base URL.
- **No sound on Play** → click Play once more; ensure your output device is up; check the player error box and browser console.
- **Slow first Play** → dirt-samples are being fetched from GitHub. Subsequent plays are cached.
- **Generated code throws** → click the code panel to edit, fix manually, or re-prompt.

## Roadmap — next version

### Song-structure aware generation (planned)

**Problem.** Today the user has to know a fair bit of music theory (tempo, key, voicings, song form, etc.) to coax a non-trivial result out of the LLM. With the default prompt, a one-liner like *"make me a sad jazz tune"* tends to produce a single flat Strudel pattern that loops without variation — no intro, no verse/chorus contrast, no bridge, no outro. It sounds repetitive because, structurally, it _is_ repetitive.

**Goal.** Let the user describe a song in **one plain sentence** and have the LLM act as an arranger:

1. **Decompose the request.** From the natural-language brief, the LLM first produces a high-level **song plan** (a structured JSON / outline), not Strudel code. The plan covers:
   - Global parameters: tempo (BPM), key & mode, time signature, overall mood, target duration.
   - Section list with explicit roles: `intro`, `verse`, `pre-chorus`, `chorus`, `bridge`, `breakdown`, `outro`, …
   - Per-section attributes: bars/length, harmonic progression, rhythmic motif, instrumentation (drums / bass / pads / lead / fx), dynamics, and how it should _contrast_ with the neighboring sections.
2. **Render each section.** The plan is then expanded — section by section — into Strudel code, either in a single follow-up LLM call or in N parallel calls (one per section). Each section reuses the global key/tempo so they line up.
3. **Stitch the song together.** The host concatenates the per-section patterns into one Strudel program with proper cycle/bar arrangement (e.g. via `cat`, `seq`, `arrange`, or a timeline of `.early`/`.late` cues), so the final output plays as a real arc — intro → verse → chorus → … → outro — instead of one infinite loop.
4. **Surface the plan in the UI.** Show the song plan as an editable outline above the code panels, so users can tweak section order, swap a chorus for a bridge, change the key, or regenerate just one section without redoing the whole song.

**Why this matters.** It moves the user's mental model from *"prompt → one pattern"* to *"prompt → arrangement → patterns → song"*, which is what makes the result feel composed instead of looped. It also turns the existing multi-endpoint parallelism into something more useful than running the same prompt N times: different endpoints can render different sections, or compete on the same section.

> Status: **design-only**, not implemented yet. Tracking item for the next version. Implementation will likely touch `src/lib/prompt.ts` (a new "arranger" system prompt), `src/app/api/generate/route.ts` (two-stage call: plan, then sections), and the UI (a new song-plan panel above the result panels).

## License

This project is licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**. See the [LICENSE](./LICENSE) file for the full text.

This project depends on [Strudel](https://strudel.cc/) (`@strudel/web` and related packages), which is itself licensed under AGPL-3.0-or-later. As a result, any distribution or network deployment of this project must comply with the AGPL, including making the corresponding source code available to users who interact with the service over a network.
