# Deploy to Vercel

This project supports two storage backends for the **default-LLM daily quota counter**, selected automatically at runtime:

| Environment | Backend | Trigger |
| --- | --- | --- |
| Vercel / any serverless | Upstash Redis (REST) | When `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_*` equivalents) are set |
| Local development | SQLite at `data/app.db` | When no Redis credentials are present |

You don't need to change any code — the app picks the right backend on boot.

---

## 1. Push the repo to GitHub / GitLab / Bitbucket

Vercel imports from a Git provider. Make sure the repo is up to date.

## 2. Import the project on Vercel

1. Open https://vercel.com/new and select your repository.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `next build` (default). Output: `.next` (default).
4. Don't deploy yet — finish the env vars & storage steps first.

## 3. Add a Redis (Upstash) store

In the project page on Vercel:

1. Go to **Storage → Marketplace**.
2. Install an **Upstash Redis** integration (or any Marketplace Redis that injects `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL`).
3. Connect it to this project.

Vercel will inject the following env vars into your deployments automatically:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- (and/or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`)

The app accepts either pair.

## 4. Configure environment variables

In **Project → Settings → Environment Variables**, add the LLM defaults (Production + Preview):

| Name | Required | Example |
| --- | --- | --- |
| `DEFAULT_LLM_BASE_URL` | optional | `https://api.openai.com/v1` |
| `DEFAULT_LLM_API_KEY` | optional | `sk-...` |
| `DEFAULT_LLM_MODEL` | optional | `gpt-4o-mini` |
| `DEFAULT_LLM_DAILY_LIMIT` | optional | `100` |

If you leave the `DEFAULT_LLM_*` block empty, users must configure their own endpoint via Settings inside the app — that path doesn't need Redis at all.

> Do **not** set `DATABASE_PATH` on Vercel. SQLite is unused there.

## 5. Deploy

Click **Deploy**. Subsequent pushes to the connected branch trigger automatic redeploys.

---

## Local development (no changes needed)

```bash
cp .env.example .env.local
# Fill in DEFAULT_LLM_* if you want the official endpoint in dev.
# Leave KV_REST_API_* blank to use SQLite.
npm install
npm run dev
```

To exercise the Redis path locally, run `vercel env pull .env.local` after step 3 above.

## Notes

- `better-sqlite3` is in `optionalDependencies`. If its native build fails on Vercel's runner, the deploy still succeeds because the Redis path is used at runtime.
- The Redis counter uses key prefix `default_llm_usage:<UTC-date>` and auto-expires after 3 days.
- Day rollover is computed in UTC, matching the original SQLite implementation.
