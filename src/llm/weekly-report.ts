/**
 * 每周学习报告
 * 处理 review_weekly 意图
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface WeeklyReportResponse {
  text: string;
}

const WEEKLY_REPORT_PROMPT = `你是"考研小管家"的周报生成模块。请基于用户的学习记录数据，生成一份结构化的每周学习报告。

【报告结构】
请严格按以下结构输出：

## 📊 本周学习报告

### 本周概览
- 总学习时长：X小时X分钟
- 日均学习：X小时X分钟
- 连续打卡：X天
- 本周记录：X条

### 各科时长对比
用柱状图风格展示各科学习时长，格式：
- 高数  ████████████  Xh Xm
- 英语  ██████████    Xh Xm
- 政治  ████          Xh Xm
- 专业课  ████████    Xh Xm
（用█字符模拟进度条，根据时长比例绘制）

### 完成率分析
- 计划完成率：X%（已完成/总计划数）
- 未完成项目：列出未完成的计划

### 薄弱科目预警
- 标记本周学习时长低于2小时/天的科目
- 对比上周（如有数据），标记下降趋势的科目
- 给出具体预警原因

### 下周建议
给出3-5条具体可执行的建议，格式：
1. 建议内容（原因）
2. ...

【规则】
- 如果用户学习记录较少，不要编造数据，如实说明
- 数据要精确到分钟
- 柱状图的█数量要按比例缩放（最长的科目用12个█）
- 语气鼓励，重点突出进步，弱化不足
- 如果某科完全没有记录，特别提醒需要关注`;

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
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[周报] 生成失败:', error);
    return { text: '抱歉，生成周报时出现问题，请稍后再试。' };
  }
}
