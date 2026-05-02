/**
 * 考研知识问答
 * 处理 qa_ask / qa_explain / qa_example 意图
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface QaResponse {
  text: string;
}

const QA_ASK_PROMPT = `你是"考研小管家"的知识问答模块。用户在提问考研知识问题，请按考研难度讲解。

【回答结构】
1. 概念定义：用简洁的语言解释核心概念
2. 核心要点：列出关键公式、定理或要点（如适用）
3. 考研例题：给出一道考研真题难度的例题，附详细解题步骤
4. 易错提醒：指出常见错误或易混淆点（如有）

【规则】
- 按考研难度讲解，不要太简单也不要过度深入
- 如果涉及数学公式，用文字描述或LaTeX格式
- 结合用户的目标院校和专业课背景（如有）
- 语言通俗易懂，像一个靠谱的研友在讲解
- 控制在合理篇幅，不要过于冗长`;

const QA_EXPLAIN_PROMPT = `你是"考研小管家"的知识讲解模块。用户希望用通俗的方式理解某个概念。

【回答要求】
- 用生活中的类比和直觉来解释，避免堆砌公式
- 先给一个"一句话理解"，再展开讲解
- 举一个贴近生活的例子帮助理解
- 最后点出"考试会怎么考"，回到考研实战
- 语言轻松友好，像给室友讲解一样`;

const QA_EXPLAIN_EXAMPLE_PROMPT = `你是"考研小管家"的练习题生成模块。用户需要练习题来巩固知识。

【输出要求】
- 生成2-3道练习题，难度从基础到考研真题递进
- 每道题包含：题目、选项（如选择题）、答案、详细解析
- 解析要讲清楚解题思路，不只是给答案
- 如果用户指定了科目或知识点，围绕该知识点出题
- 如果用户说"出两道题"等具体数量，按用户要求来`;

/**
 * 处理知识问答相关意图
 */
export async function handleQaIntent(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<QaResponse> {
  const subIntent = intent.subIntent;
  const topic = intent.extractedData?.topic || '';

  switch (subIntent) {
    case 'qa_ask':
      return await askQuestion(message, topic, client, memoryContext);

    case 'qa_explain':
      return await explainConcept(message, topic, client, memoryContext);

    case 'qa_example':
      return await generateExamples(message, topic, client, memoryContext);

    default:
      return { text: '你想问什么考研知识呢？可以直接问我问题，或者让我解释某个概念、出练习题。' };
  }
}

async function askQuestion(
  message: string,
  topic: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<QaResponse> {
  const prompt = `${QA_ASK_PROMPT}\n\n【用户问题】${message}\n${topic ? `【知识点】${topic}` : ''}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[QA] 回答失败:', error);
    return { text: '抱歉，回答出了点问题，请稍后再试。' };
  }
}

async function explainConcept(
  message: string,
  topic: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<QaResponse> {
  const prompt = `${QA_EXPLAIN_PROMPT}\n\n【用户请求】${message}\n${topic ? `【要解释的概念】${topic}` : ''}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[QA] 解释失败:', error);
    return { text: '抱歉，解释出了点问题，请稍后再试。' };
  }
}

async function generateExamples(
  message: string,
  topic: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<QaResponse> {
  const prompt = `${QA_EXPLAIN_EXAMPLE_PROMPT}\n\n【用户请求】${message}\n${topic ? `【知识点】${topic}` : ''}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[QA] 出题失败:', error);
    return { text: '抱歉，出题出了点问题，请稍后再试。' };
  }
}
