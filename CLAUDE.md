# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**kaoyan-butler (考研小管家)** — AI-powered study assistant for Chinese graduate school exam preparation. TypeScript/Node.js backend with Express + WebSocket, single-page HTML frontend, DeepSeek LLM integration, Zhipu GLM-4V for image recognition, KaTeX for math formula rendering.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with hot reload (tsx watch, port 3000) |
| `npm run build` | TypeScript compilation to `dist/` |
| `npm start` | Production server from `dist/index.js` |
| `npx tsx test-intent.ts` | Unit tests for intent regex matching + safety checks |
| `npx tsx test-integration.ts` | Integration tests for info extraction logic |
| `npx tsx test-ws.ts` | E2E WebSocket tests (requires running server on :3000) |

No formal test framework — tests use a custom `assert()` helper with pass/fail counting. Run manually with `npx tsx`.

## Environment

Required (set in `.env`, gitignored — see `.env.example`):

- `DEEPSEEK_API_KEY` — Get from https://platform.deepseek.com/

Optional:

- `ZHIPU_API_KEY` — Enables image recognition via Zhipu GLM-4V. Get from https://open.bigmodel.cn/
- `PORT` — Defaults to 3000
- `DEEPSEEK_BASE_URL` — Override DeepSeek API endpoint (default: `https://api.deepseek.com/v1/chat/completions`)
- `DEEPSEEK_MODEL` — Override DeepSeek model (default: `deepseek-v4-flash`)
- `ZHIPU_BASE_URL` — Override Zhipu API endpoint (default: `https://open.bigmodel.cn/api/paas/v4/chat/completions`)
- `ZHIPU_MODEL` — Override Zhipu text model (default: `glm-4-flash`)
- `ZHIPU_VISION_MODEL` — Override Zhipu vision model (default: `GLM-4.6V-FlashX`)

## Architecture

### Request Flow

```
User message (WebSocket JSON)
  → If imageBase64 present: zhipuClient.imageChat() for OCR/recognition
  → processIntent() — 3-layer cascade
    Layer 1: regex.ts — zero-cost keyword match (greetings, thanks, farewells)
    Layer 2: ai.ts — DeepSeek classifies into ~22 sub-intents, extracts structured data
    Layer 3: safety.ts — health/self-harm keyword check (SAFE/WARN/URGENT/BLOCK)
  → Route by subIntent prefix:
    plan_*           → handlePlanIntent()   (src/llm/plan.ts)
    qa_*             → handleQaIntent()     (src/llm/qa.ts)
    review_mistake*  → handleMistakeIntent()(src/llm/mistake.ts)
    review_weekly    → handleWeeklyReportIntent()(src/llm/weekly-report.ts)
    review_*         → handleReviewIntent() (src/llm/review.ts)
    chat_*           → handleEmotionIntent()(src/llm/emotion.ts)
    other            → deepSeekClient.simpleChat()
  → Response sent back over same WebSocket
```

Note: `review_mistake*` and `review_weekly` route before `review_*` to avoid prefix collision.

### Key Design Decisions

- **No REST routes.** All interaction is WebSocket-based. Only HTTP endpoint is `GET /health`.
- **Server is stateless.** The frontend builds a `memoryContext` text summary (profile, stats, plans) and sends it with every WebSocket message. The server has no database.
- **All persistence is browser LocalStorage.** Keys: `kaoyan-profile`, `kaoyan-study-records`, `kaoyan-plans`, `kaoyan-mistakes`, `kaoyan-pomodoro-state`, `kaoyan-guide-shown`, `kaoyan-butler-conversations` (metadata), `kaoyan-butler-chat-{convId}` (per-conversation history), `kaoyan-butler-active-conv`. Chat history supports multi-conversation with auto-migration from old `kaoyan-butler-chat-history` format.
- **Frontend is a single monolithic HTML file** (`public/index.html`, ~3300 lines) with embedded CSS and JS. It uses LXGW WenKai webfont, Chart.js, KaTeX (math rendering), and marked.js (Markdown parsing) from CDN. Sidebar tabs: 今日计划、学习统计、错题本、周报、数据.
- **The `src/llm/memory/` module is frontend-oriented** — `storage.ts` uses `localStorage` which doesn't exist in Node.js. The actual memory flow is: frontend builds context → sends via WebSocket → server uses it in prompts.

### LLM Client Pattern

`src/llm/types.ts` defines the `LLMClient` interface. `DeepSeekClient` (`deepseek.ts`) handles text LLM calls. `ZhipuClient` (`zhipu.ts`) handles image recognition via GLM-4V (multimodal). Each domain handler (plan, qa, review, mistake, emotion, weekly-report) constructs its own system prompt + context and calls the LLM independently.

### Centralized Config

`src/config.ts` holds all tunable constants (API endpoints, model names, timeouts, token limits). Every value can be overridden via environment variables. No hardcoded URLs, model names, or timeouts should appear outside this file.

### Intent Sub-Intents

`study_log`, `study_query`, `study_break`, `plan_create`, `plan_query`, `plan_modify`, `plan_complete`, `qa_ask`, `qa_explain`, `qa_example`, `review_query`, `review_schedule`, `review_stage`, `review_mistake`, `review_mistake_query`, `review_mistake_review`, `review_weekly`, `chat_greeting`, `chat_chat`, `chat_comfort`, `chat_encouragement`, `chat_help`

Plus server-side: `image_recognize` (set when image is sent without a matching intent)

## Module System

ES modules (`"type": "module"` in package.json). All imports must use `.js` extensions. Target: ES2022. Strict mode enabled.

## Deployment

Configured for two platforms:

- **Render.com** — `render.yaml` (free tier). Build: `npm install && npm run build`. Start: `npm start`.
- **Glitch** — `glitch.json`. Same build/start commands. Set env vars in Glitch dashboard.
