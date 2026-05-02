/**
 * 考研计划生成与管理
 * 处理 plan_create / plan_query / plan_modify / plan_complete 意图
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface PlanItem {
  time: string;
  subject: string;
  task: string;
  status: 'pending' | 'done' | 'skipped';
}

export interface PlanResponse {
  text: string;           // 自然语言回复
  planData?: {
    date: string;
    items: PlanItem[];
  };
}

const PLAN_CREATE_PROMPT = `你是"考研小管家"的计划生成模块。根据用户需求，生成一份考研复习计划。

【输出要求】
严格输出以下JSON格式，不要输出其他内容：
{
  "reply": "给用户的自然语言回复（简洁鼓励）",
  "date": "YYYY-MM-DD",
  "items": [
    { "time": "09:00-10:30", "subject": "高数", "task": "复习极限与连续", "status": "pending" },
    { "time": "14:00-15:30", "subject": "英语", "task": "阅读理解精读2篇", "status": "pending" }
  ]
}

【规则】
- 每天安排3-5个学习任务，每个1-2小时
- 合理分配四科（政治、英语、数学、专业课）
- 上午精力好，安排数学/专业课等硬核科目
- 下午安排英语/政治
- 晚上安排复习巩固或轻松任务
- 考虑用户提到的具体科目和需求
- 如果用户只说"安排明天"，按均衡分配
- 如果用户指定了科目，重点安排该科，其他科适当安排
- 时间段用24小时制，格式如 "09:00-10:30"`;

const PLAN_MODIFY_PROMPT = `你是"考研小管家"的计划修改模块。根据用户要求修改现有计划。

【现有计划】
{EXISTING_PLAN}

【输出要求】
严格输出以下JSON格式：
{
  "reply": "给用户的回复",
  "date": "YYYY-MM-DD",
  "items": [修改后的完整计划项列表]
}

【规则】
- 只修改用户提到的部分，其他保持不变
- 如果用户说"取消xxx"，将对应项的status设为"skipped"
- 如果用户说"加一个xxx"，在合适时间段插入新项
- 如果用户说"把xxx改到后天"，从当天计划中移除`;

/**
 * 处理计划相关意图
 */
export async function handlePlanIntent(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  existingPlanJson?: string
): Promise<PlanResponse> {
  const subIntent = intent.subIntent;

  switch (subIntent) {
    case 'plan_create':
      return await createPlan(message, intent, client);

    case 'plan_query':
      return handlePlanQuery(intent, existingPlanJson);

    case 'plan_modify':
      return await modifyPlan(message, intent, client, existingPlanJson);

    case 'plan_complete':
      return handlePlanComplete(intent, existingPlanJson);

    default:
      return { text: '你想查看还是制定复习计划呢？' };
  }
}

async function createPlan(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient
): Promise<PlanResponse> {
  const data = intent.extractedData;
  let targetDate = '';

  // 从用户消息中提取日期
  if (message.includes('明天') || message.includes('明日')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    targetDate = d.toISOString().split('T')[0];
  } else if (message.includes('后天')) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    targetDate = d.toISOString().split('T')[0];
  } else {
    // 默认今天
    targetDate = new Date().toISOString().split('T')[0];
  }

  const prompt = `${PLAN_CREATE_PROMPT}\n\n【用户需求】${message}\n【目标日期】${targetDate}\n${data.subject ? `【指定科目】${data.subject}` : ''}`;

  try {
    const response = await client.simpleChat(prompt);
    const parsed = parsePlanJson(response, targetDate);

    if (parsed) {
      const date = parsed.date || targetDate;
      let text = `📋 ${date} 的复习计划已安排好：\n\n`;
      parsed.items.forEach((item) => {
        text += `⬜ ${item.time} ${item.subject} - ${item.task}\n`;
      });
      text += `\n${parsed.reply || '加油，按计划一步步来！'}`;

      return {
        text,
        planData: {
          date,
          items: parsed.items,
        },
      };
    }

    // JSON解析失败，返回纯文本
    return { text: response };
  } catch (error: any) {
    console.error('[计划] 生成失败:', error);
    return { text: '计划生成失败，请稍后再试。' };
  }
}

function handlePlanQuery(intent: IntentResult, existingPlanJson?: string): PlanResponse {
  if (!existingPlanJson || existingPlanJson === '[]') {
    return {
      text: '你还没有制定复习计划呢！告诉我"帮我安排今天的复习"，我来帮你制定一份。',
    };
  }

  try {
    const plans = JSON.parse(existingPlanJson);
    const message = intent.extractedData?.date || '';

    let targetDate: string;
    if (message.includes('明天') || message.includes('明日')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      targetDate = d.toISOString().split('T')[0];
    } else if (message.includes('后天')) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      targetDate = d.toISOString().split('T')[0];
    } else {
      targetDate = new Date().toISOString().split('T')[0];
    }

    const plan = plans.find((p: any) => p.date === targetDate);
    if (!plan || !plan.items?.length) {
      const dateLabel = message.includes('明天') ? '明天' : '今天';
      return {
        text: `${dateLabel}还没有制定计划呢！需要我帮你安排吗？`,
      };
    }

    const pending = plan.items.filter((i: any) => i.status === 'pending');
    const done = plan.items.filter((i: any) => i.status === 'done');

    let text = `📋 ${targetDate} 的复习计划：\n\n`;
    plan.items.forEach((item: any, idx: number) => {
      const statusIcon = item.status === 'done' ? '✅' : item.status === 'skipped' ? '⏭️' : '⬜';
      text += `${statusIcon} ${item.time} ${item.subject} - ${item.task}\n`;
    });

    if (done.length > 0) {
      text += `\n已完成 ${done.length}/${plan.items.length} 项`;
    }

    return { text, planData: { date: targetDate, items: plan.items } };
  } catch {
    return { text: '读取计划失败，请重试。' };
  }
}

async function modifyPlan(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  existingPlanJson?: string
): Promise<PlanResponse> {
  const targetDate = new Date().toISOString().split('T')[0];

  if (!existingPlanJson || existingPlanJson === '[]') {
    return {
      text: '你还没有制定计划呢！先告诉我"帮我安排今天的复习"吧。',
    };
  }

  const prompt = PLAN_MODIFY_PROMPT
    .replace('{EXISTING_PLAN}', existingPlanJson!)
    + `\n\n【用户要求】${message}\n【目标日期】${targetDate}`;

  try {
    const response = await client.simpleChat(prompt);
    const parsed = parsePlanJson(response, targetDate);

    if (parsed) {
      const date = parsed.date || targetDate;
      let text = `📋 计划已更新：\n\n`;
      parsed.items.forEach((item) => {
        const icon = item.status === 'done' ? '✅' : item.status === 'skipped' ? '⏭️' : '⬜';
        text += `${icon} ${item.time} ${item.subject} - ${item.task}\n`;
      });
      text += `\n${parsed.reply || '计划已调整，加油！'}`;

      return {
        text,
        planData: {
          date,
          items: parsed.items,
        },
      };
    }

    return { text: response };
  } catch (error: any) {
    console.error('[计划] 修改失败:', error);
    return { text: '计划修改失败，请稍后再试。' };
  }
}

function handlePlanComplete(intent: IntentResult, existingPlanJson?: string): PlanResponse {
  const data = intent.extractedData;
  const subject = data?.subject || data?.content || '';

  if (!existingPlanJson) {
    return { text: `太棒了！继续加油 💪` };
  }

  try {
    const plans = JSON.parse(existingPlanJson);
    const today = new Date().toISOString().split('T')[0];
    const plan = plans.find((p: any) => p.date === today);

    if (!plan) {
      return { text: `太棒了！继续加油 💪` };
    }

    // 查找匹配的计划项并标记完成
    let matched = false;
    for (const item of plan.items) {
      if (subject && (item.subject.includes(subject) || subject.includes(item.subject))) {
        item.status = 'done';
        matched = true;
      }
    }

    const doneCount = plan.items.filter((i: any) => i.status === 'done').length;
    const total = plan.items.length;

    if (matched) {
      return {
        text: `✅ 已完成！${doneCount}/${total} 项已完成，${total - doneCount > 0 ? `还剩${total - doneCount}项，继续加油！` : '今天的计划全部完成了，太棒了！🎉'}`,
        planData: { date: today, items: plan.items },
      };
    }

    return { text: `太棒了！继续加油 💪` };
  } catch {
    return { text: `太棒了！继续加油 💪` };
  }
}

function parsePlanJson(response: string, fallbackDate: string): { reply: string; date?: string; items: PlanItem[] } | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.items || !Array.isArray(data.items)) return null;

    // 确保每个item有正确的status
    const items: PlanItem[] = data.items.map((item: any) => ({
      time: item.time || '',
      subject: item.subject || '',
      task: item.task || '',
      status: ['pending', 'done', 'skipped'].includes(item.status) ? item.status : 'pending',
    }));

    return {
      reply: data.reply || '计划已生成！',
      date: data.date || fallbackDate,
      items,
    };
  } catch {
    return null;
  }
}
