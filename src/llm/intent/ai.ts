/**
 * 第二层：AI意图识别
 * 通过DeepSeek API对用户消息进行意图分类
 */

import { DeepSeekClient } from '../deepseek.js';

// 意图分类结果
export interface IntentResult {
  intent: string;           // 大类：study/plan/qa/review/chat
  subIntent: string;        // 子意图：study_log/plan_create/qa_ask 等
  confidence: number;       // 置信度 0-1
  reasoning: string;        // 推理过程
  extractedData: Record<string, any>;  // 提取的结构化数据
  rawResponse: string;      // AI原始响应
}

// 意图分类提示词
const INTENT_PROMPT = `你是"考研小管家"的意图识别模块。请分析用户消息，判断用户想做什么。

【意图分类体系】

| 大类 | 子意图 | 说明 | 用户示例 |
|------|--------|------|---------|
| study | study_log | 记录今日学习 | "今天学了3小时高数"、"背了200个单词" |
| study | study_query | 查询学习进度 | "这周数学学了多少？"、"今天学了多久" |
| study | study_break | 休息记录 | "休息20分钟"、"休息一下" |
| plan | plan_create | 制定复习计划 | "帮我安排明天的复习"、"制定一个英语计划" |
| plan | plan_query | 查看计划 | "明天有什么安排？"、"今天的计划" |
| plan | plan_modify | 修改计划 | "把数学改到后天"、"今天加一小时政治" |
| plan | plan_complete | 完成计划 | "今天的英语做完了"、"计划完成了" |
| qa | qa_ask | 提问知识 | "什么是泰勒展开？"、"线性代数特征值怎么求" |
| qa | qa_explain | 请求解释 | "能通俗解释一下中值定理吗？" |
| qa | qa_example | 请求举例/练习 | "给我出两道概率论的题" |
| review | review_query | 查薄弱点 | "我高数哪些章节薄弱？" |
| review | review_schedule | 安排复习 | "根据遗忘曲线安排政治复习" |
| review | review_stage | 阶段咨询 | "现在该进入强化阶段了吗？" |
| review | review_mistake | 记录错题 | "记录一道高数错题"、"我这道积分题做错了，答案是x³+C" |
| review | review_mistake_query | 查看错题 | "看看我的错题"、"高数有哪些错题" |
| review | review_mistake_review | 错题分析 | "分析我的错题模式"、"错题有什么规律" |
| chat | chat_greeting | 问候 | "你好"（较长的问候） |
| chat | chat_chat | 闲聊/倾诉 | "考研好累啊"、"今天状态不错" |
| chat | chat_comfort | 焦虑安抚 | "感觉来不及了"、"考不上怎么办" |
| chat | chat_encouragement | 鼓励 | "坚持了60天了！" |
| chat | chat_help | 求助 | "不知道怎么用" |

【输出要求】
请严格输出以下JSON格式，不要输出其他内容：
{
  "intent": "大类",
  "subIntent": "子意图",
  "confidence": 0.95,
  "reasoning": "一句话说明判断依据",
  "extractedData": {
    "subject": "科目（如有）",
    "duration": 时长数字（如有）,
    "durationUnit": "小时/分钟（如有）",
    "content": "学习内容（如有）",
    "topic": "知识点（如有）",
    "question": "错题内容（仅review_mistake）",
    "userAnswer": "用户的错误答案（仅review_mistake）",
    "correctAnswer": "正确答案（仅review_mistake）",
    "errorType": "错误类型：概念混淆/计算失误/方法错误/审题不清（仅review_mistake）"
  }
}

注意：
- confidence 表示你对这个分类的确信程度，0.7以下表示不太确定
- extractedData 只提取用户明确提到的信息，不要猜测
- 如果是考研知识问题，topic 字段填写具体知识点`;

/**
 * 第二层：AI意图识别
 * @param message 用户消息
 * @param client DeepSeek客户端
 * @returns 意图识别结果
 */
export async function aiIntentRecognition(
  message: string,
  client: DeepSeekClient
): Promise<IntentResult> {
  const prompt = `${INTENT_PROMPT}\n\n【用户消息】\n${message}`;

  try {
    const response = await client.simpleChat(prompt);
    const parsed = parseIntentResponse(response);

    return {
      ...parsed,
      rawResponse: response,
    };
  } catch (error: any) {
    console.error('[意图识别] AI调用失败:', error);
    // 降级为通用对话
    return {
      intent: 'chat',
      subIntent: 'chat_chat',
      confidence: 0.5,
      reasoning: 'AI意图识别失败，降级为通用对话',
      extractedData: {},
      rawResponse: error.message,
    };
  }
}

/**
 * 解析AI返回的意图JSON
 */
function parseIntentResponse(response: string): Omit<IntentResult, 'rawResponse'> {
  try {
    // 尝试从响应中提取JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('未找到JSON');
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      intent: data.intent || 'chat',
      subIntent: data.subIntent || 'chat_chat',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
      reasoning: data.reasoning || '',
      extractedData: data.extractedData || {},
    };
  } catch (error) {
    console.error('[意图识别] JSON解析失败:', response);
    return {
      intent: 'chat',
      subIntent: 'chat_chat',
      confidence: 0.5,
      reasoning: '意图解析失败',
      extractedData: {},
    };
  }
}
