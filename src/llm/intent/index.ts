/**
 * 三层意图识别系统
 * 第一层：正则快速匹配（零成本）
 * 第二层：AI意图识别（DeepSeek）
 * 第三层：安全检查规则
 */

import { DeepSeekClient } from '../deepseek.js';
import { regexMatch } from './regex.js';
import { aiIntentRecognition, IntentResult } from './ai.js';
import { safetyCheck, SafetyResult } from './safety.js';

export { regexMatch } from './regex.js';
export { type IntentResult } from './ai.js';
export { type SafetyResult } from './safety.js';

// 完整的意图处理结果
export interface IntentProcessResult {
  layer: 1 | 2 | 3;         // 命中哪一层
  handled: boolean;          // 是否已处理（Layer 1命中则直接返回）
  response?: string;         // 直接回复（Layer 1命中时）
  intent?: IntentResult;     // AI意图识别结果（Layer 2）
  safety?: SafetyResult;     // 安全检查结果（Layer 3）
  needsLLM: boolean;         // 是否需要调用LLM生成回复
}

/**
 * 三层意图识别主流程
 * @param message 用户消息
 * @param client DeepSeek客户端
 * @returns 处理结果
 */
export async function processIntent(
  message: string,
  client: DeepSeekClient
): Promise<IntentProcessResult> {
  // === 第一层：正则快速匹配 ===
  const regexResult = regexMatch(message);
  if (regexResult) {
    console.log(`[意图] 第一层命中: ${regexResult.type}`);
    return {
      layer: 1,
      handled: true,
      response: regexResult.response,
      needsLLM: false,
    };
  }

  // === 第二层：AI意图识别 ===
  let intentResult: IntentResult | undefined;
  if (client.isAvailable()) {
    console.log('[意图] 进入第二层: AI意图识别');
    intentResult = await aiIntentRecognition(message, client);
    console.log(`[意图] AI识别结果: ${intentResult.subIntent} (置信度: ${intentResult.confidence})`);
  } else {
    // AI不可用时，降级为通用对话
    intentResult = {
      intent: 'chat',
      subIntent: 'chat_chat',
      confidence: 0.5,
      reasoning: 'AI服务不可用',
      extractedData: {},
      rawResponse: '',
    };
  }

  // === 第三层：安全检查 ===
  const safetyResult = safetyCheck(message);
  if (safetyResult.level !== 'SAFE') {
    console.log(`[意图] 第三层命中: ${safetyResult.category} (${safetyResult.level})`);
    return {
      layer: 3,
      handled: true,
      response: safetyResult.message,
      intent: intentResult,
      safety: safetyResult,
      needsLLM: false,
    };
  }

  // 需要调用LLM生成回复
  return {
    layer: 2,
    handled: false,
    intent: intentResult,
    safety: safetyResult,
    needsLLM: true,
  };
}
