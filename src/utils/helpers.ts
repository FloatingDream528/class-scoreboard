import type { ScoreRecord, DateRange } from "../types";

/** 生成带前缀的随机 ID */
export function idOf(prefix: string): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

/** 获取本周一 00:00 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

/** 带符号显示数字 */
export function withSign(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

/** 格式化时间 "M-D HH:mm" */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 短日期 "M/D" */
export function shortDay(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 求和 */
export function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + (fn(item) || 0), 0);
}

/** 按 id 查找 */
export function findById<T extends { id: string }>(
  arr: T[],
  id: string | null
): T | undefined {
  if (!id) return undefined;
  return arr.find((item) => item.id === id);
}

/** 过滤有效（未撤销）记录 */
export function validRecords(records: ScoreRecord[]): ScoreRecord[] {
  return records.filter((r) => !r.revoked);
}

/** 按日期范围过滤 */
export function filterByDateRange(
  records: ScoreRecord[],
  range: DateRange
): ScoreRecord[] {
  if (!range || range === "all") return records;
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return records.filter((r) => {
    const t = new Date(r.createdAt);
    if (range === "today") return t >= todayStart;
    if (range === "week") return t >= weekStart;
    if (range === "month") return t >= monthStart;
    return true;
  });
}

/** 生成日期标签数组 */
export function getDayLabels(days: number): string[] {
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    labels.push(shortDay(d));
  }
  return labels;
}
