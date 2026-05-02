/**
 * 长期记忆数据类型
 */

// 用户考研档案
export interface UserProfile {
  name?: string;            // 姓名
  undergraduateSchool?: string;  // 本科院校
  targetSchool?: string;    // 目标院校
  targetMajor?: string;     // 目标专业
  examDate?: string;        // 考试日期（YYYY-MM-DD）
  stage?: '基础' | '强化' | '冲刺' | '考前';  // 备考阶段
  subjects: SubjectInfo[];  // 考试科目
  weakPoints?: string[];    // 薄弱知识点
  studyPreference?: string; // 学习偏好
  createdAt: number;        // 创建时间
  updatedAt: number;        // 更新时间
}

// 科目信息
export interface SubjectInfo {
  name: string;             // 科目名称：政治/英语/数学/专业课
  targetScore?: number;     // 目标分数
  currentLevel?: string;    // 当前水平
  weakPoints?: string[];    // 该科目薄弱点
}

// 学习记录
export interface StudyRecord {
  date: string;             // 日期 YYYY-MM-DD
  subject: string;          // 科目
  duration: number;         // 时长（分钟）
  content: string;          // 学习内容
  completed: boolean;       // 是否完成
  createdAt: number;
}

// 学习统计
export interface StudyStats {
  todayMinutes: number;     // 今日学习时长
  weekMinutes: number;      // 本周学习时长
  monthMinutes: number;     // 本月学习时长
  totalDays: number;        // 累计学习天数
  streakDays: number;       // 连续学习天数
  subjectBreakdown: Record<string, number>;  // 各科时长分布
}

// 计划项
export interface PlanItem {
  time: string;             // 时间段 "09:00-10:00"
  subject: string;          // 科目
  task: string;             // 任务
  status: 'pending' | 'done' | 'skipped';
}

// 每日计划
export interface DailyPlan {
  date: string;             // 日期 YYYY-MM-DD
  stage?: string;           // 备考阶段
  items: PlanItem[];
  createdAt: number;
}

// 记忆存储键名
export const MEMORY_KEYS = {
  PROFILE: 'kaoyan-profile',
  STUDY_RECORDS: 'kaoyan-study-records',
  PLANS: 'kaoyan-plans',
  CHAT_HISTORY: 'kaoyan-chat-history',
} as const;
