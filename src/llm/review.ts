/**
 * 考研提醒与复习建议
 * 处理 review_query / review_schedule / review_stage 意图
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface ReviewResponse {
  text: string;
}

const REVIEW_QUERY_PROMPT = `你是"考研小管家"的复习分析模块。用户想了解自己的薄弱点。

【任务】
根据用户的学习记录和档案信息，分析薄弱科目和知识点。

【回答结构】
1. 薄弱科目分析：列出学习时长较少或未覆盖的科目
2. 具体薄弱点：根据用户提到的科目，列出常见薄弱章节
3. 建议：针对薄弱点给出具体复习建议

【规则】
- 结合用户的记忆上下文（学习记录、薄弱点、目标院校）
- 如果有学习数据，用数据说话（"高数只学了2小时，英语学了8小时"）
- 如果没有数据，根据考研常见薄弱点给出通用建议
- 语气鼓励，不要制造焦虑`;

const REVIEW_SCHEDULE_PROMPT = `你是"考研小管家"的复习安排模块。用户希望根据遗忘曲线安排复习。

【遗忘曲线复习间隔】
- 第1次复习：学完后1天
- 第2次复习：学完后3天
- 第3次复习：学完后7天
- 第4次复习：学完后15天
- 之后每月回顾一次

【输出格式】
给出一个具体的复习时间表，格式如下：
- 今天：复习 [科目]-[章节]（距上次学习X天）
- 明天：复习 [科目]-[章节]
- 后天：复习 [科目]-[章节]

【规则】
- 结合用户的学习记录，找出需要复习的内容
- 如果用户指定了科目，重点安排该科
- 如果没有指定，按遗忘曲线优先级排列
- 每天安排1-2个复习任务，不要太多`;

const REVIEW_STAGE_PROMPT = `你是"考研小管家"的备考阶段顾问。用户在咨询备考阶段建议。

【考研四阶段】
- 基础阶段（3-6月）：过教材、打基础、跟基础课
- 强化阶段（7-9月）：刷题强化、攻克重难点、做真题
- 冲刺阶段（10-11月）：真题模拟、查漏补缺、政治背诵
- 考前阶段（12月）：回归基础、调整心态、模拟演练

【回答要求】
1. 判断用户当前应该处于哪个阶段（根据当前日期和考试日期）
2. 给出该阶段的核心任务清单
3. 如果用户进度落后，给出追赶建议
4. 如果用户进度超前，给出进阶建议

【规则】
- 结合用户的考试日期和目标院校
- 语气像一个有经验的学长/学姐
- 给具体可执行的建议，不要泛泛而谈`;

/**
 * 处理复习提醒相关意图
 */
export async function handleReviewIntent(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<ReviewResponse> {
  const subIntent = intent.subIntent;

  switch (subIntent) {
    case 'review_query':
      return await queryWeakPoints(message, client, memoryContext);

    case 'review_schedule':
      return await scheduleReview(message, client, memoryContext);

    case 'review_stage':
      return await stageAdvice(message, client, memoryContext);

    default:
      return { text: '你想了解薄弱点、安排复习计划，还是咨询备考阶段呢？' };
  }
}

async function queryWeakPoints(
  message: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<ReviewResponse> {
  const prompt = `${REVIEW_QUERY_PROMPT}\n\n【用户问题】${message}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[Review] 薄弱点分析失败:', error);
    return { text: '抱歉，分析出了点问题，请稍后再试。' };
  }
}

async function scheduleReview(
  message: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<ReviewResponse> {
  const prompt = `${REVIEW_SCHEDULE_PROMPT}\n\n【用户需求】${message}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[Review] 复习安排失败:', error);
    return { text: '抱歉，安排出了点问题，请稍后再试。' };
  }
}

async function stageAdvice(
  message: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<ReviewResponse> {
  const today = new Date().toISOString().split('T')[0];
  const prompt = `${REVIEW_STAGE_PROMPT}\n\n【今天日期】${today}\n【用户问题】${message}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[Review] 阶段建议失败:', error);
    return { text: '抱歉，建议出了点问题，请稍后再试。' };
  }
}
