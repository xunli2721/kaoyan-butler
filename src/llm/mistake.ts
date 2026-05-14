/**
 * 错题本管理
 * 处理 review_mistake / review_mistake_query / review_mistake_review 意图
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface MistakeResponse {
  text: string;
  mistakeData?: {
    id: string;
    date: string;
    subject: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    errorType: string;
    analysis: string;
  };
}

const REVIEW_MISTAKE_PROMPT = `你是"考研小管家"的错题分析模块。用户记录了一道错题，你需要分析错误原因并给出解题策略。

【任务】
1. 分析用户的错误原因（概念混淆/计算失误/方法错误/审题不清）
2. 给出正确的解题思路和步骤
3. 总结同类题的解题策略
4. 列出关联知识点供复习

【输出要求】
请严格输出以下JSON格式，不要输出其他内容：
{
  "reply": "给用户的回复（简洁鼓励）",
  "errorType": "概念混淆/计算失误/方法错误/审题不清",
  "analysis": "详细的错题分析（纯文本格式）"
}

【analysis 格式要求 — 非常重要】
analysis 字段必须使用纯文本格式，不要使用任何 markdown 符号：
- 不要用 **粗体**、### 标题、--- 分隔线、\`代码\` 等 markdown 语法
- 用"一、二、三"或"1. 2. 3."作为编号
- 用"【错误诊断】""【正确解法】""【同类题策略】""【关联知识点】"作为段落标题
- 数学公式使用 $...$（行内）或 $$...$$（块级）格式
- 分数用 $\\frac{a}{b}$，确保花括号完整配对
- 不要用 \\( \\) 或 \\[ \\] 作为公式分隔符
- 每个公式写完后检查花括号是否配对，不要出现未闭合的括号

【规则】
- 语气鼓励，不要批评用户
- 分析要具体，针对这道题
- 同类题策略要可操作
- 如果信息不足以判断正确答案，给出推测并说明`;

const REVIEW_MISTAKE_QUERY_PROMPT = `你是"考研小管家"的错题查询模块。用户想查看自己的错题记录。

【任务】
根据用户提供的错题列表，按科目分组展示，给出简要摘要。

【回答结构】
1. 按科目分组展示错题
2. 每道错题显示：题目摘要（截取前50字）、错误类型、日期
3. 如果用户指定了科目，只展示该科目的错题

【规则】
- 如果没有错题记录，提示用户开始记录
- 语气简洁友好
- 结尾鼓励用户继续记录`;

const REVIEW_MISTAKE_REVIEW_PROMPT = `你是"考研小管家"的错题模式分析模块。用户想了解自己的错题规律。

【任务】
分析用户的错题分布，找出规律和薄弱点。

【分析维度】
1. 错误类型分布：哪种错误最常见？
2. 科目分布：哪科错题最多？
3. 时间趋势：错题是在增加还是减少？
4. 薄弱知识点：哪些知识点反复出错？

【回答结构】
1. 错题总览（总数、各科分布）
2. 主要错误模式分析
3. 针对性复习建议
4. 鼓励和下一步行动

【规则】
- 用数据说话（"高数错题占60%，其中概念混淆类最多"）
- 建议要具体可执行
- 如果错题太少，说明样本不够，建议继续记录`;

/**
 * 处理错题本相关意图
 */
export async function handleMistakeIntent(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<MistakeResponse> {
  const subIntent = intent.subIntent;

  switch (subIntent) {
    case 'review_mistake':
      return await recordMistake(message, intent, client, memoryContext);

    case 'review_mistake_query':
      return await queryMistakes(message, intent, client, memoryContext);

    case 'review_mistake_review':
      return await reviewMistakes(message, client, memoryContext);

    default:
      return { text: '你想记录错题、查看错题，还是分析错题规律呢？' };
  }
}

async function recordMistake(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<MistakeResponse> {
  const data = intent.extractedData;
  const today = new Date().toISOString().split('T')[0];

  const prompt = `${REVIEW_MISTAKE_PROMPT}\n\n【用户记录的错题】${message}\n${data.subject ? `【科目】${data.subject}` : ''}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    const parsed = parseMistakeJson(response);

    if (parsed) {
      const id = Date.now().toString();
      return {
        text: parsed.reply,
        mistakeData: {
          id,
          date: today,
          subject: data.subject || '未分类',
          question: data.question || message,
          userAnswer: data.userAnswer || '',
          correctAnswer: data.correctAnswer || '',
          errorType: parsed.errorType || data.errorType || '未分类',
          analysis: parsed.analysis || '',
        },
      };
    }

    // JSON解析失败，仍然保存基本记录
    const id = Date.now().toString();
    return {
      text: response,
      mistakeData: {
        id,
        date: today,
        subject: data.subject || '未分类',
        question: data.question || message.substring(0, 200),
        userAnswer: data.userAnswer || '',
        correctAnswer: data.correctAnswer || '',
        errorType: data.errorType || '未分类',
        analysis: response,
      },
    };
  } catch (error: any) {
    console.error('[错题本] 记录失败:', error);
    return { text: '抱歉，错题分析出了点问题，请稍后再试。' };
  }
}

async function queryMistakes(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<MistakeResponse> {
  const subject = intent.extractedData?.subject || '';
  const prompt = `${REVIEW_MISTAKE_QUERY_PROMPT}\n\n【用户问题】${message}\n${subject ? `【指定科目】${subject}` : ''}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[错题本] 查询失败:', error);
    return { text: '抱歉，查询出了点问题，请稍后再试。' };
  }
}

async function reviewMistakes(
  message: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<MistakeResponse> {
  const prompt = `${REVIEW_MISTAKE_REVIEW_PROMPT}\n\n【用户问题】${message}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[错题本] 分析失败:', error);
    return { text: '抱歉，分析出了点问题，请稍后再试。' };
  }
}

function parseMistakeJson(response: string): { reply: string; errorType?: string; analysis?: string } | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.reply) return null;

    return {
      reply: data.reply,
      errorType: data.errorType || '',
      analysis: data.analysis || '',
    };
  } catch {
    return null;
  }
}
