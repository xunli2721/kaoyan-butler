/**
 * 每周学习报告
 * 处理 review_weekly 意图
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface WeeklyReportResponse {
  text: string;
}

const WEEKLY_REPORT_PROMPT = `你是"考研小管家"的周报生成模块。请基于用户的学习记录数据，生成一份简洁的每周学习报告。

【报告结构】
请按以下结构输出（保持简洁，不要画ASCII柱状图）：

## 📊 本周学习报告

### 本周概览
- 总学习时长：X小时X分钟
- 日均学习：X小时X分钟
- 连续打卡：X天

### 各科时长
用一行一科的格式列出，例如：
- 高数：8h 30min
- 英语：5h 20min
- 政治：3h 10min
- 专业课：6h 40min

### 完成率
- 计划完成率：X%
- 未完成项：列出未完成的计划（如有）

### 薄弱科目
- 标记学习时长最低的科目
- 给出简要预警

### 下周建议
给出2-3条具体建议（简洁）

【规则】
- 数据要精确到分钟
- 语气鼓励，重点突出进步
- 保持简洁，总字数控制在500字以内`;

export async function handleWeeklyReportIntent(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  memoryContext?: string,
  weeklyRecordsJson?: string
): Promise<WeeklyReportResponse> {
  let extraContext = '';
  if (weeklyRecordsJson) {
    extraContext = `\n\n【本周学习记录原始数据】\n${weeklyRecordsJson}`;
  }

  const prompt = `${WEEKLY_REPORT_PROMPT}\n\n【用户请求】${message}${extraContext}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext, 120000);
    return { text: response };
  } catch (error: any) {
    console.error('[周报] 生成失败:', error);
    return { text: '抱歉，生成周报时出现问题，请稍后再试。' };
  }
}
