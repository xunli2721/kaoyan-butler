/**
 * 第三层：安全检查规则
 * 检测用户消息中的健康风险和心理风险
 */

export type RiskLevel = 'SAFE' | 'WARN' | 'URGENT' | 'BLOCK';

export interface SafetyResult {
  level: RiskLevel;
  category: string;       // 风险类别
  matchedKeywords: string[];  // 匹配到的关键词
  message: string;        // 安全提示信息
}

// 安全检查规则
interface SafetyRule {
  category: string;
  level: RiskLevel;
  keywords: string[];
  message: string;
}

const SAFETY_RULES: SafetyRule[] = [
  // 身体不适 - 提醒休息
  {
    category: '身体不适',
    level: 'WARN',
    keywords: ['头疼', '头痛', '眼睛疼', '眼睛干', '颈椎疼', '脖子疼', '腰疼', '腰酸',
               '失眠', '睡不着', '恶心', '头晕', '眼花', '看不清'],
    message: '身体是革命的本钱！学习很重要，但身体更重要。建议：\n1. 暂时放下书本，休息15-20分钟\n2. 做做眼保健操或伸展运动\n3. 如果持续不适，请及时就医\n\n考研是持久战，保持好身体才能走到最后！',
  },
  // 过度学习 - 提醒劳逸结合
  {
    category: '过度学习',
    level: 'WARN',
    keywords: ['学了12小时', '学了13小时', '学了14小时', '学了15小时', '学了16小时',
               '通宵', '通宵复习', '通宵学习', '连续3天', '连续三天', '没休息',
               '不吃东西', '没吃饭', '一天没吃', '只睡了3小时', '只睡了4小时'],
    message: '考研备考要注意节奏！过度学习反而会降低效率：\n1. 每天学习8-10小时已经很充足了\n2. 保证6-8小时睡眠\n3. 按时吃饭，适当运动\n\n记住：效率 > 时长，状态好才能学得进！',
  },
  // 考研焦虑 - 关怀安抚
  {
    category: '考研焦虑',
    level: 'URGENT',
    keywords: ['学不进去', '想放弃', '放弃考研', '考不上了', '考不上怎么办',
               '压力好大', '压力很大', '好焦虑', '很焦虑', '焦虑死了',
               '崩溃', '心态崩了', '受不了', '坚持不下去', '不想考了',
               '来不及了', '时间不够', '感觉没希望', '绝望', '抑郁'],
    message: '考研路上，焦虑和迷茫是正常的，每个考研人都经历过。你不是一个人在战斗：\n\n1. 深呼吸，给自己5分钟放空时间\n2. 回顾一下你已经走过的路，你比想象中更强大\n3. 把大目标拆成小任务，一步一步来\n4. 如果觉得撑不住，和身边的人聊聊，或者寻求专业心理咨询\n\n你选择了考研，已经很勇敢了。坚持下去，结果不会辜负努力的人！',
  },
  // 比较焦虑 - 引导关注自身
  {
    category: '比较焦虑',
    level: 'WARN',
    keywords: ['别人进度', '室友考上了', '同学进度', '差距好大', '别人都',
               '我太慢了', '跟不上', '别人学得', '他们都', '室友已经', '室友复习',
               '别人复习', '同学都', '别人已经'],
    message: '每个人都有自己的节奏，考研不是比速度的比赛：\n1. 别人的进度不代表你的真实水平\n2. 扎扎实实学一天，比焦虑地学三天更有效\n3. 关注自己的薄弱点，针对性提升\n\n你的对手只有昨天的自己！',
  },
  // 自伤相关 - 紧急
  {
    category: '自伤风险',
    level: 'BLOCK',
    keywords: ['不想活', '活着没意思', '自杀', '自残', '跳楼', '割腕', '不想活了'],
    message: '我非常担心你现在的状态。考研只是人生的一个阶段，你的生命和健康比任何考试都重要。\n\n请立即寻求帮助：\n📞 全国24小时心理援助热线：400-161-9995\n📞 北京心理危机研究与干预中心：010-82951332\n📞 生命热线：400-821-1215\n\n你不是一个人，请一定寻求专业帮助。',
  },
];

/**
 * 第三层：安全检查
 * @param message 用户消息
 * @returns 安全检查结果
 */
export function safetyCheck(message: string): SafetyResult {
  const lower = message.toLowerCase();

  for (const rule of SAFETY_RULES) {
    const matchedKeywords: string[] = [];

    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      return {
        level: rule.level,
        category: rule.category,
        matchedKeywords,
        message: rule.message,
      };
    }
  }

  return {
    level: 'SAFE',
    category: 'none',
    matchedKeywords: [],
    message: '',
  };
}

/**
 * 获取所有安全规则（用于展示/调试）
 */
export function getSafetyRules(): SafetyRule[] {
  return SAFETY_RULES;
}
