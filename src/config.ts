/**
 * 集中配置 — 所有硬编码常量统一管理
 * 环境变量优先，fallback 为默认值
 */

export const CONFIG = {
  // ── 服务 ──────────────────────────────────────
  PORT: Number(process.env.PORT) || 3000,

  // ── LLM 端点 ─────────────────────────────────
  DEEPSEEK_BASE_URL:
    process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1/chat/completions',
  ZHIPU_BASE_URL:
    process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',

  // ── 模型名称 ─────────────────────────────────
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  ZHIPU_MODEL: process.env.ZHIPU_MODEL || 'glm-4-flash',
  ZHIPU_VISION_MODEL: process.env.ZHIPU_VISION_MODEL || 'GLM-4.6V-FlashX',

  // ── 超时 (ms) ────────────────────────────────
  DEFAULT_TIMEOUT_MS: 30_000,
  IMAGE_TIMEOUT_MS: 60_000,
  WEEKLY_REPORT_TIMEOUT_MS: 120_000,

  // ── Token 限制 ───────────────────────────────
  DEFAULT_MAX_TOKENS: 2048,
} as const;
