/**
 * 第一层：正则快速匹配（零成本）
 * 短消息（≤15字）直接匹配关键词，不调用LLM
 */

interface RegexRule {
  type: string;
  keywords: string[];
  response: string;
  exact?: boolean; // 是否精确匹配整个消息
}

// 考研场景的快速匹配规则
const REGEX_RULES: RegexRule[] = [
  // 寒暄问候
  {
    type: 'greeting',
    keywords: ['你好', '您好', 'hi', 'hello', '早上好', '下午好', '晚上好', '早安', '晚安', '嗨'],
    response: '你好呀！考研人加油💪 今天有什么需要我帮忙的吗？',
    exact: true,
  },
  // 感谢确认
  {
    type: 'thanks',
    keywords: ['谢谢', '感谢', 'thanks', '多谢', '太感谢了'],
    response: '不客气！考研路上我会一直陪着你，有需要随时找我~',
    exact: true,
  },
  // 确认/肯定
  {
    type: 'confirm',
    keywords: ['好的', '嗯', 'ok', '行', '可以', '没问题', '知道了', '明白', '收到'],
    response: '好的！继续加油，考研人！',
    exact: true,
  },
  // 告别结束
  {
    type: 'farewell',
    keywords: ['再见', '拜拜', 'bye', '下次见', '走了', '先走了', '晚安'],
    response: '拜拜！记得按时复习哦，明天见~',
    exact: true,
  },
  // 简单询问
  {
    type: 'help',
    keywords: ['在吗', '在不', '帮助', 'help', '怎么用', '你能做什么', '你是谁'],
    response: '我在呀！我是考研小管家，可以帮你：\n1. 📝 记录每日学习（"今天学了3小时高数"）\n2. 📅 制定复习计划（"帮我安排明天的复习"）\n3. 📚 解答考研问题（"什么是泰勒展开？"）\n4. 📊 查看学习统计（"这周学了多少小时？"）\n5. 💪 考研心态关怀（随时找我聊）',
    exact: true,
  },
  // 否定拒绝
  {
    type: 'refuse',
    keywords: ['不用了', '算了', '取消', '没事了', '不要了', '不需要'],
    response: '好的，有需要随时找我~',
    exact: true,
  },
];

/**
 * 第一层：正则快速匹配
 * @param message 用户消息
 * @returns 匹配结果，null表示未匹配（需要进入第二层）
 */
export function regexMatch(message: string): { type: string; response: string } | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // 长度限制：超过15字交给AI处理
  if (trimmed.length > 15) {
    return null;
  }

  for (const rule of REGEX_RULES) {
    for (const keyword of rule.keywords) {
      if (rule.exact) {
        // 精确匹配：消息内容完全等于关键词
        if (lower === keyword.toLowerCase()) {
          return { type: rule.type, response: rule.response };
        }
      } else {
        // 包含匹配
        if (lower.includes(keyword.toLowerCase())) {
          return { type: rule.type, response: rule.response };
        }
      }
    }
  }

  return null;
}

/**
 * 获取所有正则规则（用于展示/调试）
 */
export function getRegexRules(): RegexRule[] {
  return REGEX_RULES;
}

/**
 * 获取关键词总数
 */
export function getKeywordCount(): number {
  return REGEX_RULES.reduce((sum, rule) => sum + rule.keywords.length, 0);
}
