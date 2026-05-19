# any_llm_to_music

[English](./README.md) | **简体中文**

> 使用任意兼容 OpenAI 协议的 LLM 生成 **[Strudel](https://strudel.cc)** 音乐模式，并直接在浏览器中播放。

![flow](https://img.shields.io/badge/flow-prompt%20%E2%86%92%20LLM(s)%20%E2%86%92%20Strudel%20%E2%86%92%20audio-7c5cff)

## 功能特性

- 🆓 **开箱即用的默认接口** —— 服务端内置默认 LLM，带每日额度限制（默认 100 次/天，所有访客共享）。额度耗尽时，界面会提示：`官方提供的AI接口额度不足，可自行接入API`。
- 🔌 **自带接口配置** —— 可在「设置」中添加任意数量的 OpenAI 兼容 AI 接口。每个接口仅需四个字段：**名称 / Base URL / API Key / Model**。
- 🧪 **每个接口一键 `Test`** —— 通过极小开销的 `ping → pong` 往返调用，验证连通性、模型可用性和密钥有效性。
- 🎼 **多接口并行生成** —— 当配置了 N 个用户接口时，每次「生成」会并行调用全部 N 个接口，并渲染 **N 个独立音乐面板**，每个面板拥有独立的代码编辑器与播放/停止按钮。
- 🎹 **浏览器内播放** —— 通过 `@strudel/web`（真正的 Strudel 引擎，并非 iframe 嵌入）。
- 💾 **历史记录** —— 生成的模式持久化保存在本地 SQLite。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置（可选 —— 仅在需要使用内置默认接口时配置）
cp .env.example .env.local
# 编辑 .env.local，填入 DEFAULT_LLM_*（详见下文）

# 3. 启动开发服务器
npm run dev
# → http://localhost:3000
```

> 必须**点击 Play** 才会开始播放音频（浏览器自动播放策略限制）。首次 Play 还会从 GitHub 下载 dirt-samples 采样库，请耐心等待几秒。

## 密钥解析优先级

每次请求的优先级规则非常简单：

```
用户在「设置」中配置了任一有效接口  →  使用用户接口（并行）
                  否则             →  使用默认接口（如已配置）
                  否则             →  报错
```

两条路径**互斥**：只要有至少一个有效的用户接口，默认接口就不会被调用，每日额度也不会被消耗。

## 环境变量

默认接口是单一的 OpenAI 兼容 chat API：

| 变量 | 用途 | 默认值 |
|---|---|---|
| `DEFAULT_LLM_BASE_URL` | OpenAI 兼容 base URL | `https://api.openai.com/v1` |
| `DEFAULT_LLM_API_KEY` | 默认接口的 API key | _空 → 默认接口被禁用_ |
| `DEFAULT_LLM_MODEL` | 默认接口使用的模型 id | `gpt-4o-mini` |
| `DEFAULT_LLM_DAILY_LIMIT` | 全部访客共享的每日最大调用次数（按 UTC 日） | `100` |
| `DATABASE_PATH` | SQLite 文件路径 | `data/app.db` |

如果 `DEFAULT_LLM_BASE_URL`/`DEFAULT_LLM_API_KEY`/`DEFAULT_LLM_MODEL` 中任一为空，则视为默认接口**未配置** —— 用户必须在「设置」中提供自己的接口。

每日计数器持久化在 SQLite（`default_llm_usage` 表，按 UTC 日期为键），重启不会丢失，并在 UTC 零点重置。

## 设置：单接口配置

「设置」中每个接口仅含四个字段，且**仅**保存在浏览器的 `localStorage` 中：

| 字段 | 示例 |
|---|---|
| 名称 | `My OpenAI`、`DeepSeek 主号`、`OpenRouter Claude` |
| Base URL | `https://api.openai.com/v1` |
| API Key | `sk-…` |
| Model | `gpt-4o-mini`、`deepseek-chat`、`anthropic/claude-3.5-sonnet` |

点击 **`＋ 新增接口`** 添加更多接口，点击 **`Test`** 验证接口可用性。

> 由于所有接口共用同一条 OpenAI 兼容代码路径，原生 Anthropic API（使用 `x-api-key` + `/v1/messages`）暂不直接支持。请使用 Anthropic 官方的 OpenAI 兼容网关、OpenRouter 或其他兼容代理。

## 工作原理

```
浏览器  ─prompt + endpoints[]─►  /api/generate
                                    │
                                    ▼
                  ┌─────────────────┴─────────────────┐
                  │                                   │
       有 endpoints？  是                              否
                  │                                   │
                  ▼                                   ▼
   Promise.all(并行调用每个接口)         检查每日额度 → 调用默认接口
                  │                                   │
                  └──────► EndpointGenerateResult[] ◄─┘
                                    │
                                    ▼
                       提取 ```js 代码块
                                    │
   浏览器  ◄── 渲染 N 个面板（每个接口结果一个）
                                    │
                       点击 ▶ Play  →  @strudel/web .evaluate(code)  →  Web Audio
```

- 系统提示词（system prompt）会教 LLM 学习 Strudel mini-notation 与若干示例模式（`src/lib/prompt.ts`）。
- 生成的代码必须是单一的 \`\`\`javascript 代码块；宿主端会自动调用 `evaluate` 与 `hush`，LLM 无需关心。
- 独立的 `/api/test-endpoint` 路由为「设置」中的 **Test** 按钮服务；它会发送一个仅 8 token 的 `ping` 请求，要求模型回复 `pong`。

> 注意：`@strudel/web` 暴露的是**单例全局引擎**。即便页面上出现多个结果面板，同时也只能播放一个 —— 在另一个面板按 Play 会替换掉当前的循环。

## 项目结构

```
src/
├── app/
│   ├── page.tsx                       # 主界面（多面板结果）
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── generate/route.ts          # POST prompt[+endpoints] → results[]
│       ├── test-endpoint/route.ts     # POST {baseURL,apiKey,model} → ping/pong
│       └── tracks/                    # 历史记录的增删改查
├── components/
│   ├── EndpointResultPanel.tsx        # 每个接口结果一张卡片
│   ├── SettingsDrawer.tsx             # 接口列表 + Test 按钮
│   ├── PromptPanel.tsx
│   ├── HistoryList.tsx
│   ├── CodeEditor.tsx
│   ├── StrudelPlayer.tsx
│   └── ui/Button.tsx
├── hooks/
│   ├── useEndpoints.ts                # localStorage v2 + 旧版迁移
│   └── useStrudel.ts
├── lib/
│   ├── llmClient.ts                   # OpenAI 兼容 chatComplete + chatPing
│   ├── env.ts                         # 默认 LLM 配置与辅助函数
│   ├── db.ts                          # tracks + default_llm_usage 仓储
│   ├── prompt.ts
│   └── strudel/extractCode.ts
└── types/index.ts
```

## 安全说明

- 在「设置」中保存的接口存放于浏览器 `localStorage`，并随每次生成请求转发给本服务端。它们**绝不会写入数据库**。在共享机器上请谨慎使用。
- 默认接口的密钥（`DEFAULT_LLM_API_KEY`）仅存在于服务端。
- 每日额度是一个软性共享限制 —— **没有按用户身份的隔离**。恶意访客很容易将其耗尽。请将额度设得保守一些，对真实工作负载请使用用户自有密钥。

## 部署

`better-sqlite3` 是原生模块，需运行在 Node.js runtime（而非 Edge）。在 Vercel 上，路由处理器默认使用 `runtime = 'nodejs'`（已设置）。

## 旧版本迁移

- 旧的 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `OPENROUTER_API_KEY` 环境变量已废弃 —— 请用单一的 `DEFAULT_LLM_*` 替代，或不配置默认接口、改用「设置」。
- 旧的按 provider 划分的 `localStorage`（`any_llm_to_music.userKeys.v1`）会在首次加载时自动迁移到新的 `endpoints.v2` 结构（每个有密钥的 provider 一条记录）。
- 旧的 `tracks.provider` 列已被 `tracks.endpoint_name` 替代；`src/lib/db.ts` 中的一次性 `ALTER TABLE` 迁移会保留既有历史记录。

## 故障排查

- **"官方提供的AI接口额度不足，可自行接入API"** → 当日共享额度已耗尽。请在「设置」中添加自己的接口。
- **"未配置默认 AI 接口"** → 既未设置 `DEFAULT_LLM_*` 环境变量，也未配置用户接口。请二选一。
- **`Test` 返回 401** → API key 错误，或该 key 没有访问所选模型的权限。
- **`Test` 返回 404 / "model not found"** → Model 字段拼写错误，或该 Base URL 不提供此模型。
- **Play 后无声** → 再次点击 Play；确认音频输出设备正常；查看播放器错误框与浏览器控制台。
- **首次 Play 缓慢** → 正在从 GitHub 拉取 dirt-samples，后续会有缓存。
- **生成的代码运行报错** → 点击代码面板手动修改，或重新提示生成。

## 许可证

MIT.
