# any_llm_to_music — 实现计划 (Plan)

> 项目目标：构建一个 Web 应用，用户在浏览器中输入自然语言提示词 → 选择已配置的 LLM（Anthropic / OpenAI / OpenRouter 等）→ 由 LLM 生成 [Strudel](https://strudel.cc/) 代码 → 通过 `@strudel/web` 嵌入到页面中直接播放，并把会话/曲目持久化到本地 SQLite。

---

## 1. 仓库研究结论 (Repo Research)

- 工作目录 `/Users/huangzhe/any_llm_to_music` 当前为空，属于**全新 (greenfield) 项目**，没有既有代码和约定需要兼容。
- 因此可以自由选择技术栈，按照下方"用户已确认的决策"直接搭建。

### 用户已确认的决策

| 维度 | 选择 |
| --- | --- |
| 技术栈 | **Next.js 全栈**（App Router + TypeScript + React 18 + API Routes） |
| API Key 存储 | **服务端 `.env` + 可选前端覆盖**（前端覆盖仅存 `localStorage`，调用时随请求传给后端代理） |
| Strudel 集成 | **`@strudel/web` 官方 npm 包**（自定义 UI，不使用 iframe / `@strudel/repl`） |
| 持久化 | **服务端 SQLite**（保存提示词、生成代码、所选模型、播放配置） |

### 关键技术调研要点

- `@strudel/web` 通过 `initStrudel()` 初始化，提供 `evaluate(code)` / `hush()` 等全局函数，最适合"自定义 UI + 由代码字符串驱动播放"的场景。
- 浏览器自动播放策略要求音频必须在用户点击后启动，所以 Play 按钮必须是真实的用户手势触发。
- `initStrudel({ prebake: () => samples('github:tidalcycles/dirt-samples') })` 可以加载默认采样库，供 LLM 生成代码使用。
- LLM SDK：
  - Anthropic：`@anthropic-ai/sdk`
  - OpenAI：`openai`
  - OpenRouter：完全兼容 OpenAI SDK，仅需切换 `baseURL=https://openrouter.ai/api/v1`
- SQLite：选用 `better-sqlite3`（同步、零配置、Next.js Node runtime 友好）；ORM 用轻量的 `drizzle-orm` 或直接手写 SQL（计划中默认 `better-sqlite3` + 手写 SQL，避免引入额外学习成本）。

---

## 2. 系统架构 (Architecture)

```
┌──────────────────────────── Browser ────────────────────────────┐
│  Next.js App Router (React 18 + TS + Tailwind)                  │
│   ├─ PromptPanel         用户输入 + 模型选择                     │
│   ├─ CodeEditor          展示/手动编辑生成的 Strudel 代码        │
│   ├─ StrudelPlayer       封装 @strudel/web，play / stop          │
│   ├─ SettingsDrawer      管理浏览器侧 key 覆盖（localStorage）    │
│   └─ HistoryList         会话/曲目历史                            │
└──────────┬──────────────────────────────────────────────────────┘
           │  fetch (JSON)
┌──────────▼──────────────── Server (Next.js Route Handlers) ─────┐
│  /api/models       GET  列出已配置模型（合并 .env + 前端覆盖）    │
│  /api/generate     POST  代理调用 LLM，返回 Strudel 代码          │
│  /api/tracks       GET/POST/DELETE  曲目 CRUD                     │
│  lib/providers/*   anthropic.ts / openai.ts / openrouter.ts       │
│  lib/db.ts         better-sqlite3 + 迁移                          │
│  lib/prompt.ts     System Prompt 模板（教 LLM 写 Strudel）         │
└─────────────────────────────────────────────────────────────────┘
                  │
            data/app.db (SQLite, gitignored)
```

### 安全模型
- 所有 LLM 调用都经服务端 `/api/generate` 代理，避免在浏览器暴露服务端 key。
- 前端覆盖的 key 仅存 `localStorage`，调用时通过 HTTPS 请求体传给后端，**不写入数据库**，仅在本次请求生命周期内使用。
- `.env.local` 加入 `.gitignore`；`README` 中提供 `.env.example` 模板。

---

## 3. 目录结构 (Files & Modules)

```
any_llm_to_music/
├── .env.example
├── .gitignore
├── README.md
├── next.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── drizzle/ (可选，若改用 ORM)
├── data/                          # SQLite 数据文件（运行时生成，gitignored）
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                # 主页：左侧 PromptPanel，右侧 Player + Code
    │   ├── globals.css
    │   └── api/
    │       ├── models/route.ts
    │       ├── generate/route.ts
    │       └── tracks/
    │           ├── route.ts        # GET list / POST create
    │           └── [id]/route.ts   # GET / DELETE
    ├── components/
    │   ├── PromptPanel.tsx
    │   ├── ModelSelector.tsx
    │   ├── CodeEditor.tsx          # 简单 textarea + 语法高亮（prism-react-renderer）
    │   ├── StrudelPlayer.tsx       # 'use client'，封装 @strudel/web
    │   ├── SettingsDrawer.tsx
    │   ├── HistoryList.tsx
    │   └── ui/                     # 通用按钮、输入框等
    ├── lib/
    │   ├── db.ts                   # better-sqlite3 实例 + migrate
    │   ├── prompt.ts               # System Prompt 模板 + few-shot 示例
    │   ├── env.ts                  # 解析 .env，列出可用 provider
    │   ├── providers/
    │   │   ├── types.ts            # ChatProvider 接口
    │   │   ├── anthropic.ts
    │   │   ├── openai.ts
    │   │   └── openrouter.ts
    │   └── strudel/
    │       └── extractCode.ts      # 从 LLM 输出里提取 ```javascript code block
    ├── hooks/
    │   ├── useStrudel.ts
    │   └── useLocalKeys.ts
    └── types/
        └── index.ts
```

每个文件控制在 500 行以内，按"单一职责"拆分。

---

## 4. 数据库模型 (SQLite Schema)

```sql
CREATE TABLE IF NOT EXISTS tracks (
  id          TEXT PRIMARY KEY,        -- uuid
  title       TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  code        TEXT NOT NULL,           -- 生成的 Strudel 代码
  provider    TEXT NOT NULL,           -- anthropic / openai / openrouter
  model       TEXT NOT NULL,
  created_at  INTEGER NOT NULL         -- unix ms
);

CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
```

> 不存储任何 API Key。

---

## 5. 环境变量 (.env.example)

```env
# 任一或多个 provider 都可留空；留空则前端模型列表中不出现该 provider，
# 用户可在 Settings 抽屉里通过 localStorage 临时配置 key。
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=

# 可选：自定义默认模型
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-latest
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet

# 可选：覆盖 baseURL（用于自建网关）
OPENAI_BASE_URL=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

---

## 6. 实施步骤 (Step-by-step)

> 每一步都是相对独立、可落地的任务；执行阶段会用 `TodoWrite` 跟踪。

### Step 1 — 项目脚手架
- `npx create-next-app@latest any_llm_to_music --ts --app --tailwind --eslint --src-dir --no-import-alias` 等价初始化；
- 写入 `tsconfig.json` paths 别名 `@/*`；
- 添加 `.gitignore`（含 `data/`, `.env.local`）。

### Step 2 — 依赖安装
- 运行：
  - `pnpm add @strudel/web @anthropic-ai/sdk openai better-sqlite3 zod nanoid prism-react-renderer`
  - `pnpm add -D @types/better-sqlite3`
- 在 `next.config.mjs` 中将 `better-sqlite3` 标记为 `serverExternalPackages`，避免被打包。

### Step 3 — 数据库与启动迁移
- `src/lib/db.ts`：单例 `Database('data/app.db')`，启动时执行 schema migration。
- 写一个轻量 `tracksRepo`（list / get / create / delete）。

### Step 4 — Provider 抽象层
- `src/lib/providers/types.ts`：
  ```ts
  export interface ChatProvider {
    id: 'anthropic' | 'openai' | 'openrouter';
    listModels(): Promise<string[]>;        // 静态/可配置
    generate(opts: { prompt: string; model: string; apiKey: string; baseURL?: string }): Promise<string>;
  }
  ```
- 三个实现文件分别封装官方 SDK；OpenRouter 复��� `openai` SDK + 自定义 `baseURL`。
- `src/lib/env.ts`：聚合 `.env` 中可用 provider；前端覆盖的 key 通过请求体传入，优先级高于 `.env`。

### Step 5 — System Prompt
- `src/lib/prompt.ts`：内嵌教 LLM 写 Strudel 的 system prompt（包含 `note()`, `s()`, `.fast()`, mini-notation 等核心 API 的要点 + 2~3 个 few-shot 例子）；
- 强制要求 LLM 仅用单个 \`\`\`javascript code block 输出最终代码；
- `src/lib/strudel/extractCode.ts`：用正则提取 code block，剥离前后说明。

### Step 6 — API Route Handlers
- `GET /api/models`：返回 `{ providers: [{ id, models, source: 'env' | 'user' }] }`；接收 `x-user-keys` header（JSON）合并展示。
- `POST /api/generate`：body `{ prompt, provider, model, userKeys? }` → 解析 key → 调 provider → 提取代码 → 返回 `{ code, raw }`。同时写入 `tracks` 表。
- `GET/POST/DELETE /api/tracks`：标准 CRUD（创建在 generate 内部完成，这里主要是 list / get / delete）。
- 用 `zod` 校验全部请求体。

### Step 7 — Strudel 播放器组件
- `src/components/StrudelPlayer.tsx`（`'use client'`）：
  ```ts
  useEffect(() => {
    let mounted = true;
    import('@strudel/web').then(({ initStrudel }) => {
      if (!mounted) return;
      initStrudel({ prebake: () => (window as any).samples('github:tidalcycles/dirt-samples') });
      setReady(true);
    });
    return () => { mounted = false; (window as any).hush?.(); };
  }, []);
  ```
- 暴露 `play(code)` / `stop()`：内部调用全局 `evaluate(code)` 与 `hush()`；
- 错误捕获：`try/catch` 显示 LLM 代码错误，便于让用户/LLM 修复。

### Step 8 — UI 组装
- 主页布局：左 1/3 PromptPanel + ModelSelector + Generate 按钮；右 2/3 上方 CodeEditor，下方 StrudelPlayer 控制条 + 历史列表。
- SettingsDrawer：表单填入 `anthropic / openai / openrouter` 的 key 与 baseURL，存入 `localStorage`（`useLocalKeys`）。
- HistoryList：拉 `/api/tracks`，点击恢复代码到编辑器并播放。
- Tailwind 简洁深色主题，专注实用。

### Step 9 — README & 启动脚本
- README 写明：环境变量、`pnpm dev`、首次浏览器需点击播放才会出声、采样库延迟加载提示。
- `package.json` scripts：`dev` / `build` / `start` / `lint`。

### Step 10 — 验证
- `pnpm lint`、`pnpm build` 必须通过；
- 本地 `pnpm dev` 后：
  1. 不配置任何 key → UI 提示需配置；
  2. 在 SettingsDrawer 填入 OpenAI key → 选模型 → 输入 "lo-fi 鼓点 + 低音" → 出现代码 → 点击 Play 听到声音；
  3. 历史记录可恢复并删除。
- 不引入测试框架（MVP 范围）；如需要后续追加 Vitest。

---

## 7. 依赖与考量 (Dependencies & Considerations)

- **Node 版本**：≥ 18.18（Next.js 15 要求）。
- **`better-sqlite3`** 是原生模块，需在 `next.config.mjs` 设置 `serverExternalPackages: ['better-sqlite3']`，否则 Edge/Bundler 会失败。
- **`@strudel/web`** 必须在客户端动态导入（`'use client'` + `import()`），SSR 阶段无 `window` / `AudioContext`。
- **采样库下载**：首次播放 `s("bd sd")` 时会从 GitHub 拉取 dirt-samples，国内用户可能慢；README 提示可改用本地 `samples('/samples')`，但 MVP 不实现自托管。
- **OpenRouter 计费**：用户使用自己的 key，平台不代付。
- **流式输出**：MVP 使用一次性返回（非 SSE），后续可升级。

---

## 8. 风险与对策 (Risk Handling)

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| LLM 生成的代码语法错误 / 抛异常 | 播放失败，用户困惑 | UI 显示错误信息；提供 "Ask LLM to fix" 按钮把错误回填给 LLM 重新生成 |
| 用户在浏览器存了 key 后被 XSS 泄露 | key 暴露 | 文档强调 localStorage 风险；推荐生产环境只用服务端 `.env` |
| 采样库加载慢导致首次播放无声 | 体验差 | UI 显示 "Loading samples..." 状态；提供 cancel 按钮 |
| `@strudel/web` 与 Next.js SSR 冲突 | 构建失败 | 仅在 `'use client'` 组件内动态 `import()`，并在组件未 ready 时禁用 Play 按钮 |
| `better-sqlite3` 在某些托管平台无法运行（如 Vercel Edge） | 无法部署 | README 注明部署需要 Node.js Runtime（Vercel `runtime: 'nodejs'`）或自托管 |
| API key 错误 / 限流 | 生成失败 | provider 层捕获错误并返回结构化错误码，前端友好提示 |
| 不同 provider 返回格式差异 | 解析失败 | 统一提取 ```code block；找不到时回退使用整段文本并提示 |

---

## 9. 验收标准 (Definition of Done)

- [ ] 在空白机器上 `pnpm i && cp .env.example .env.local && pnpm dev` 可启动。
- [ ] 至少在三种 provider（Anthropic / OpenAI / OpenRouter）中任选其一可成功生成代码。
- [ ] 浏览器内点击 Play 能听到声音，点击 Stop 能停止。
- [ ] 历史曲目可在刷新后恢复、可删除。
- [ ] `pnpm build` 与 `pnpm lint` 全部通过。

---

> 等待用户审阅本计划。批准后我将按 Step 1 → Step 10 顺序执行，并用 `TodoWrite` 跟踪进度。
