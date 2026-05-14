/**
 * Prompt模板管理 - 考研小管家
 */

/**
 * 系统Prompt模板（考研专用）
 */
export const SYSTEM_PROMPT = `你是"考研小管家"，一个专业的AI考研备考助手，具有以下特点:

【角色定位】
- 耐心、专业的考研备考顾问
- 帮助考研学生管理四科复习计划、记录学习进度、解答知识问题
- 提供科学的复习建议（基于遗忘曲线和备考阶段）

【考研四科】
- 政治：马原、毛中特、史纲、思修、时政
- 英语：阅读、完形、翻译、作文、单词
- 数学：高数、线代、概率论（数一/数二/数三）
- 专业课：根据用户目标院校和专业

【备考阶段】
- 基础阶段（3-6月）：打基础，过一遍教材和基础课
- 强化阶段（7-9月）：刷题强化，攻克重难点
- 冲刺阶段（10-11月）：真题模拟，查漏补缺
- 考前阶段（12月）：政治背诵、英语作文模板、数学公式回顾

【核心能力】
- 学习记录: 记录每日四科学习时长和内容
- 计划管理: 制定、查询、修改每日复习计划
- 知识问答: 考研难度的知识讲解，通俗易懂
- 复习提醒: 基于遗忘曲线提醒复习
- 情绪关怀: 识别考研焦虑，提供鼓励和建议
- 进度统计: 各科学习时长、累计天数、完成率

【交互原则】
- 语言简洁，像一个靠谱的研友
- 回答具体实用，不讲空话
- 关心用户心态，考研很苦但你不是一个人
- 主动询问需求，不被动等待

【注意事项】
- 遇到心理问题建议寻求专业帮助
- 不要制造焦虑，要给信心
- 尊重用户隐私`;

/**
 * 考研场景意图识别（关键词路由）
 */
export function detectIntent(message: string): string {
  const lowerMessage = message.toLowerCase();

  // 番茄钟专注
  if (lowerMessage.includes('番茄钟') || lowerMessage.includes('专注了')) {
    return 'study_focus';
  }

  // 学习记录相关
  if (lowerMessage.includes('学了') || lowerMessage.includes('学习了') ||
      lowerMessage.includes('看了') || lowerMessage.includes('背了') ||
      lowerMessage.includes('做了') || lowerMessage.includes('复习了') ||
      lowerMessage.includes('刷了') || lowerMessage.includes('听了')) {
    return 'study_log';
  }

  // 计划相关
  if (lowerMessage.includes('计划') || lowerMessage.includes('安排') ||
      lowerMessage.includes('明天') || lowerMessage.includes('今天学什么') ||
      lowerMessage.includes('帮我定')) {
    return 'plan';
  }

  // 统计相关
  if (lowerMessage.includes('统计') || lowerMessage.includes('多少小时') ||
      lowerMessage.includes('这周') || lowerMessage.includes('本月') ||
      lowerMessage.includes('学了多久')) {
    return 'stats';
  }

  // 知识问答
  if (lowerMessage.includes('什么是') || lowerMessage.includes('怎么理解') ||
      lowerMessage.includes('解释') || lowerMessage.includes('为什么') ||
      lowerMessage.includes('怎么算') || lowerMessage.includes('公式')) {
    return 'qa';
  }

  // 复习相关
  if (lowerMessage.includes('复习') || lowerMessage.includes('薄弱') ||
      lowerMessage.includes('遗忘') || lowerMessage.includes('巩固') ||
      lowerMessage.includes('强化') || lowerMessage.includes('冲刺')) {
    return 'review';
  }

  // 考研焦虑
  if (lowerMessage.includes('累') || lowerMessage.includes('烦') ||
      lowerMessage.includes('焦虑') || lowerMessage.includes('学不进去') ||
      lowerMessage.includes('压力') || lowerMessage.includes('心情') ||
      lowerMessage.includes('来不及') || lowerMessage.includes('放弃') ||
      lowerMessage.includes('考不上') || lowerMessage.includes('崩溃')) {
    return 'emotion';
  }

  return 'general';
}

/**
 * 构建考研聊天Prompt
 */
export function buildChatPrompt(userMessage: string, context?: Record<string, any>): string {
  const intent = detectIntent(userMessage);

  let prompt = SYSTEM_PROMPT + '\n\n';

  // 根据意图添加场景提示
  switch (intent) {
    case 'study_log':
      prompt += '【当前场景】用户在记录今日考研学习情况，请确认记录并给予鼓励，可以提到坚持天数\n';
      break;
    case 'study_focus':
      prompt += '【当前场景】用户完成了一个番茄钟专注周期，请给予肯定和鼓励，建议适当休息，可以提到番茄钟的好处\n';
      break;
    case 'plan':
      prompt += '【当前场景】用户在询问或制定考研复习计划，请根据备考阶段合理安排四科\n';
      break;
    case 'stats':
      prompt += '【当前场景】用户想查看考研学习统计数据\n';
      break;
    case 'qa':
      prompt += '【当前场景】用户在提问考研知识问题，请按考研难度讲解，通俗易懂+核心要点+典型例题\n';
      break;
    case 'review':
      prompt += '【当前场景】用户在询问考研复习相关问题，可结合遗忘曲线和备考阶段建议\n';
      break;
    case 'emotion':
      prompt += '【当前场景】用户可能有考研焦虑情绪，请温暖共情，不要制造更多焦虑，给信心和实际建议\n';
      break;
    default:
      prompt += '【当前场景】一般对话，围绕考研备考\n';
  }

  // 添加考研用户信息
  if (context) {
    // 优先使用memoryContext（来自LocalStorage的完整记忆摘要）
    if (context.memoryContext) {
      prompt += context.memoryContext;
    } else {
      prompt += '\n【用户考研信息】\n';
      if (context.name) prompt += `姓名: ${context.name}\n`;
      if (context.targetSchool) prompt += `目标院校: ${context.targetSchool}\n`;
      if (context.targetMajor) prompt += `目标专业: ${context.targetMajor}\n`;
      if (context.examDate) prompt += `考试日期: ${context.examDate}\n`;
      if (context.stage) prompt += `备考阶段: ${context.stage}\n`;
      if (context.weakSubjects) prompt += `薄弱科目: ${context.weakSubjects}\n`;
      if (context.weakPoints) prompt += `薄弱知识点: ${context.weakPoints}\n`;
    }
  }

  prompt += `\n【用户消息】\n${userMessage}`;

  return prompt;
}
