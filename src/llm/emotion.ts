/**
 * 考研情绪关怀
 * 处理 chat_comfort / chat_encouragement / chat_chat 意图
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface EmotionResponse {
  text: string;
}

const COMFORT_PROMPT = `你是"考研小管家"的情绪关怀模块。用户正在经历考研焦虑或情绪低落，需要你的温暖支持。

【回复结构】
1. 共情认可：先承认用户的情绪是正常的（"这种感觉太正常了"）
2. 正常化：告诉用户几乎所有考研人都会经历这种阶段
3. 结合用户数据：如果知道用户的已坚持天数、目标院校、进度等，用数据说话（"你已经坚持了X天"）
4. 具体建议：给1-2个可立即执行的小建议（而非空洞的"加油"）
5. 温暖收尾：一句真诚的鼓励

【规则】
- 语气像一个经历过考研的学长/学姐，温暖但不鸡汤
- 不要否定用户的情绪（不要说"你不应该这样想"）
- 不要制造更多焦虑（不要说"时间真的不多了"）
- 如果用户提到具体的焦虑点（如某科学不会），针对性回应
- 控制在150字以内，不要太长
- 如果用户情绪非常严重（提到"想放弃""绝望""抑郁"等），建议寻求专业帮助`;

const ENCOURAGEMENT_PROMPT = `你是"考研小管家"的鼓励模块。用户在分享自己的进步或坚持，需要被肯定和激励。

【回复结构】
1. 热情肯定：真诚地为用户的努力点赞
2. 数据对比：用考研群体的普遍情况来衬托用户的优秀（如"能坚持X天的人不到一半"）
3. 连接目标：把用户的坚持和目标院校联系起来（如有）
4. 轻激励：鼓励继续，但不要太煽情

【规则】
- 语气热情但真诚，不要假大空
- 如果知道用户的连续学习天数、累计天数、目标院校等，融入回复
- 避免过度夸张（不要说"你太厉害了"这种空话）
- 用具体数字说话
- 控制在100字以内`;

const CHAT_PROMPT = `你是"考研小管家"，用户在和你闲聊或倾诉考研感受。像一个靠谱的研友一样回应。

【规则】
- 语气轻松自然，像朋友聊天
- 如果用户在倾诉负面情绪，表示理解但不要过度安慰
- 如果用户在分享好消息，一起开心
- 可以适当分享考研相关的趣事或小知识
- 不要讲大道理，不要说教
- 控制在80字以内
- 如果用户只是随口说说，简短回应即可`;

/**
 * 处理情绪关怀相关意图
 */
export async function handleEmotionIntent(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<EmotionResponse> {
  const subIntent = intent.subIntent;

  switch (subIntent) {
    case 'chat_comfort':
      return await comfortUser(message, client, memoryContext);

    case 'chat_encouragement':
      return await encourageUser(message, client, memoryContext);

    case 'chat_chat':
      return await chatWithUser(message, client, memoryContext);

    default:
      return { text: '' };
  }
}

async function comfortUser(
  message: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<EmotionResponse> {
  const prompt = `${COMFORT_PROMPT}\n\n【用户倾诉】${message}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[Emotion] 安抚失败:', error);
    return { text: '我理解你的感受，考研确实不容易。你已经走到了这里，这本身就很了不起。休息一下，明天继续加油。' };
  }
}

async function encourageUser(
  message: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<EmotionResponse> {
  const prompt = `${ENCOURAGEMENT_PROMPT}\n\n【用户分享】${message}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[Emotion] 鼓励失败:', error);
    return { text: '你的坚持真的很棒！继续加油，考研路上你并不孤单。' };
  }
}

async function chatWithUser(
  message: string,
  client: DeepSeekClient,
  memoryContext?: string
): Promise<EmotionResponse> {
  const prompt = `${CHAT_PROMPT}\n\n【用户消息】${message}`;

  try {
    const response = await client.simpleChat(prompt, memoryContext);
    return { text: response };
  } catch (error: any) {
    console.error('[Emotion] 闲聊失败:', error);
    return { text: '在的在的！有什么想聊的随时说~' };
  }
}
