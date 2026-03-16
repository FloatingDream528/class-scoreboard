// ─── 基础实体 ───

export interface Group {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Student {
  id: string;
  name: string;
  groupId: string;
  active: boolean;
  sortOrder: number;
}

export interface Rule {
  id: string;
  name: string;
  scoreDelta: number;
  enabled: boolean;
  sortOrder: number;
}

export interface ScoreRecord {
  id: string;
  studentId: string;
  groupId: string;
  ruleId: string;
  scoreDelta: number;
  createdAt: string; // ISO 8601
  revoked: boolean;
  revokedAt?: string | null;
}

export interface Settings {
  managePin: string;
}

// ─── 聚合数据 ───

export interface AppData {
  groups: Group[];
  students: Student[];
  rules: Rule[];
  records: ScoreRecord[];
  settings: Settings;
}

// ─── 计算结果 ───

export interface Summary {
  totalScore: number;
  todayScore: number;
  weekScore: number;
  validRecords: number;
}

export interface StudentRankRow {
  studentId: string;
  studentName: string;
  groupName: string;
  score: number;
}

export interface GroupRankRow {
  groupId: string;
  groupName: string;
  score: number;
  members: number;
  avg: string;
}

export interface GroupContribution {
  groupName: string;
  plusText: string;
  minusText: string;
}

export interface GroupTrendRow {
  groupName: string;
  values: number[];
  total: number;
}

// ─── UI 状态 ───

export type ViewName = "board" | "score" | "public" | "analytics" | "manage";
export type DateRange = "all" | "today" | "week" | "month";
export type TrendDays = 7 | 14 | 30;
