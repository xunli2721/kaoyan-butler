/**
 * 记忆存储管理（前端LocalStorage）
 */

import {
  UserProfile, SubjectInfo, StudyRecord, StudyStats,
  DailyPlan, PlanItem, MEMORY_KEYS
} from './types.js';

// ========== 用户档案 ==========

export function getProfile(): UserProfile | null {
  try {
    const data = localStorage.getItem(MEMORY_KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Partial<UserProfile>): UserProfile {
  const existing = getProfile();
  const now = Date.now();
  const merged: UserProfile = {
    subjects: [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    ...existing,
    ...profile,
  };
  localStorage.setItem(MEMORY_KEYS.PROFILE, JSON.stringify(merged));
  return merged;
}

export function updateProfileField(key: keyof UserProfile, value: any): UserProfile {
  const profile = getProfile() || { subjects: [], createdAt: Date.now(), updatedAt: Date.now() };
  (profile as any)[key] = value;
  profile.updatedAt = Date.now();
  localStorage.setItem(MEMORY_KEYS.PROFILE, JSON.stringify(profile));
  return profile;
}

// ========== 学习记录 ==========

export function getStudyRecords(): StudyRecord[] {
  try {
    const data = localStorage.getItem(MEMORY_KEYS.STUDY_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addStudyRecord(record: Omit<StudyRecord, 'createdAt'>): StudyRecord[] {
  const records = getStudyRecords();
  records.push({ ...record, createdAt: Date.now() });
  localStorage.setItem(MEMORY_KEYS.STUDY_RECORDS, JSON.stringify(records));
  return records;
}

export function getStudyStats(): StudyStats {
  const records = getStudyRecords();
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // 计算本周起始（周一）
  const dayOfWeek = now.getDay() || 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // 本月起始
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  let todayMinutes = 0;
  let weekMinutes = 0;
  let monthMinutes = 0;
  const subjectBreakdown: Record<string, number> = {};
  const studyDates = new Set<string>();

  for (const r of records) {
    studyDates.add(r.date);

    if (r.date === today) todayMinutes += r.duration;
    if (r.date >= weekStartStr) weekMinutes += r.duration;
    if (r.date >= monthStartStr) monthMinutes += r.duration;

    subjectBreakdown[r.subject] = (subjectBreakdown[r.subject] || 0) + r.duration;
  }

  // 计算连续学习天数
  let streakDays = 0;
  const sortedDates = Array.from(studyDates).sort().reverse();
  if (sortedDates.length > 0) {
    let checkDate = new Date(today);
    // 如果今天没学，从昨天开始算
    if (!studyDates.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (studyDates.has(dateStr)) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    todayMinutes,
    weekMinutes,
    monthMinutes,
    totalDays: studyDates.size,
    streakDays,
    subjectBreakdown,
  };
}

// ========== 每日计划 ==========

export function getPlans(): DailyPlan[] {
  try {
    const data = localStorage.getItem(MEMORY_KEYS.PLANS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePlan(plan: DailyPlan): DailyPlan[] {
  const plans = getPlans();
  const existingIdx = plans.findIndex(p => p.date === plan.date);
  if (existingIdx >= 0) {
    plans[existingIdx] = plan;
  } else {
    plans.push(plan);
  }
  localStorage.setItem(MEMORY_KEYS.PLANS, JSON.stringify(plans));
  return plans;
}

export function getTodayPlan(): DailyPlan | null {
  const today = new Date().toISOString().split('T')[0];
  return getPlans().find(p => p.date === today) || null;
}

export function updatePlanItem(date: string, timeSlot: string, status: PlanItem['status']): void {
  const plans = getPlans();
  const plan = plans.find(p => p.date === date);
  if (plan) {
    const item = plan.items.find(i => i.time === timeSlot);
    if (item) {
      item.status = status;
      localStorage.setItem(MEMORY_KEYS.PLANS, JSON.stringify(plans));
    }
  }
}

// ========== 记忆摘要（用于注入LLM提示词） ==========

export function getMemorySummary(): string {
  const profile = getProfile();
  const stats = getStudyStats();
  const todayPlan = getTodayPlan();

  let summary = '';

  if (profile) {
    summary += '【用户档案】\n';
    if (profile.name) summary += `姓名: ${profile.name}\n`;
    if (profile.targetSchool) summary += `目标院校: ${profile.targetSchool}\n`;
    if (profile.targetMajor) summary += `目标专业: ${profile.targetMajor}\n`;
    if (profile.examDate) {
      const daysLeft = Math.ceil((new Date(profile.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      summary += `考试日期: ${profile.examDate} (还有${daysLeft}天)\n`;
    }
    if (profile.stage) summary += `备考阶段: ${profile.stage}\n`;
    if (profile.subjects.length > 0) {
      summary += `考试科目: ${profile.subjects.map(s => s.name).join('、')}\n`;
    }
    if (profile.weakPoints && profile.weakPoints.length > 0) {
      summary += `薄弱点: ${profile.weakPoints.join('、')}\n`;
    }
    summary += '\n';
  }

  if (stats.totalDays > 0) {
    summary += '【学习统计】\n';
    summary += `累计学习${stats.totalDays}天，连续${stats.streakDays}天\n`;
    summary += `今日${stats.todayMinutes}分钟，本周${stats.weekMinutes}分钟\n`;
    if (Object.keys(stats.subjectBreakdown).length > 0) {
      summary += `各科分布: ${
        Object.entries(stats.subjectBreakdown)
          .map(([k, v]) => `${k}${Math.round(v / 60)}h`)
          .join('、')
      }\n`;
    }
    summary += '\n';
  }

  if (todayPlan && todayPlan.items.length > 0) {
    const pending = todayPlan.items.filter(i => i.status === 'pending');
    const done = todayPlan.items.filter(i => i.status === 'done');
    summary += '【今日计划】\n';
    if (done.length > 0) {
      summary += `已完成: ${done.map(i => `${i.subject}-${i.task}`).join('、')}\n`;
    }
    if (pending.length > 0) {
      summary += `待完成: ${pending.map(i => `${i.time} ${i.subject}-${i.task}`).join('、')}\n`;
    }
    summary += '\n';
  }

  return summary;
}
