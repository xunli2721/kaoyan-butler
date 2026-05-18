/**
 * 学习模式分析
 * 处理 analytics_pattern 意图
 * 基于前端传来的学习数据生成个性化建议
 */

import { DeepSeekClient } from './deepseek.js';
import type { IntentResult } from './intent/ai.js';

export interface AnalyticsResponse {
  text: string;
}

const ANALYTICS_PROMPT = `你是"考研小管家"的学习分析模块。根据用户的学习数据，给出个性化学习建议。

【回答要求】
1. 根据最佳学习时段，建议如何安排高难度任务
2. 根据各科目效率差异，建议时间再分配
3. 如果检测到疲劳，给出休息和调整建议
4. 根据错题类型分布，建议针对性练习策略
5. 输出3-5条具体可执行的建议

【规则】
- 用数据说话，引用具体数字（"高数近7天学了8小时"）
- 如果数据不足，给出通用但有用的建议
- 语气鼓励，不要制造焦虑
- 每条建议简短有力，不超过2句话`;

/**
 * 处理学习分析意图
 */
export async function handleAnalyticsIntent(
  message: string,
  intent: IntentResult,
  client: DeepSeekClient,
  analyticsJson?: string
): Promise<AnalyticsResponse> {
  let dataContext = '\n【用户学习数据】\n';

  if (analyticsJson) {
    try {
      const analytics = JSON.parse(analyticsJson);
      const { study, subjects } = analytics;

      // 距考试天数
      if (study.daysToExam !== null) {
        dataContext += `距考试还有${study.daysToExam}天`;
        if (study.stage) dataContext += `，当前阶段：${study.stage}`;
        dataContext += '\n';
      }

      // 近7天各科学习时长
      const subjectEntries = Object.entries(study.subjectMinutes7d as Record<string, number>);
      if (subjectEntries.length > 0) {
        dataContext += '近7天各科学习时长：' +
          subjectEntries.map(([s, m]) => `${s}${Math.round((m as number) / 60)}h`).join('、') + '\n';
      }

      // 各科计划完成率
      const planStats = Object.entries(study.subjectPlanStats as Record<string, any>);
      if (planStats.length > 0) {
        dataContext += '近7天各科计划完成率：' +
          planStats.map(([s, st]) => {
            const rate = st.total > 0 ? Math.round(st.done / st.total * 100) : 0;
            return `${s}${rate}%`;
          }).join('、') + '\n';
      }

      // 各科错题情况
      const mistakeEntries = Object.entries(study.subjectMistakes as Record<string, any>);
      if (mistakeEntries.length > 0) {
        dataContext += '各科错题数量：' +
          mistakeEntries.map(([s, m]) => `${s}${(m as any).count}道`).join('、') + '\n';
        for (const [s, m] of mistakeEntries) {
          const types = Object.entries((m as any).errorTypes || {});
          if (types.length > 0) {
            const topType = types.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
            dataContext += `  ${s}主要错误类型：${topType[0]}\n`;
          }
        }
      }

      // 各科详细分析
      const subjectDetails = Object.entries(subjects as Record<string, any>);
      if (subjectDetails.length > 0) {
        dataContext += '\n各科详细数据：\n';
        for (const [s, info] of subjectDetails) {
          const parts: string[] = [];
          if (info.recentStudyMinutes7d) parts.push(`近7天学习${Math.round(info.recentStudyMinutes7d / 60)}h`);
          if (info.planCompletionRate7d !== null) parts.push(`完成率${info.planCompletionRate7d}%`);
          if (info.mistakeCount) parts.push(`错题${info.mistakeCount}道`);
          if (info.daysSinceLastStudy !== null) parts.push(`距上次学习${info.daysSinceLastStudy}天`);
          if (parts.length > 0) dataContext += `  ${s}：${parts.join('，')}\n`;
        }
      }
    } catch {}
  }

  // 学习模式数据（从 analyticsJson 中提取）
  if (analyticsJson) {
    try {
      const analytics = JSON.parse(analyticsJson);
      const pattern = analytics.learningPattern;
      dataContext += '\n【学习模式分析】\n';
      if (pattern.bestTimeSlot) dataContext += `最佳学习时段：${pattern.bestTimeSlot}\n`;
      if (pattern.avgFocusMinutes) dataContext += `平均专注周期：${pattern.avgFocusMinutes}分钟\n`;
      if (pattern.timeSlotRanking?.length) {
        dataContext += '时段效率排序：' +
          pattern.timeSlotRanking.map((t: any) => `${t.slot}均${t.avgMin}min`).join(' > ') + '\n';
      }
      if (pattern.fatigueDetected) dataContext += `疲劳检测：${pattern.fatigueDetail}\n`;
      if (pattern.subjectEfficiency && Object.keys(pattern.subjectEfficiency).length > 0) {
        dataContext += '各科单位时间产出：' +
          Object.entries(pattern.subjectEfficiency).map(([s, e]) => `${s}${e}`).join('、') + '\n';
      }
    } catch {}
  }

  const prompt = `${ANALYTICS_PROMPT}\n${dataContext}\n【用户问题】${message}`;

  try {
    const response = await client.simpleChat(prompt);
    return { text: response };
  } catch (error: any) {
    console.error('[Analytics] 分析失败:', error);
    return { text: '抱歉，分析出了点问题，请稍后再试。' };
  }
}
