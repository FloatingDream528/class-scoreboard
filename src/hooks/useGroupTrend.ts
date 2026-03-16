import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  validRecords,
  shortDay,
  sumBy,
  getDayLabels,
} from "../utils/helpers";
import type { GroupTrendRow, TrendDays } from "../types";

export function useGroupTrend(days: TrendDays): {
  labels: string[];
  rows: GroupTrendRow[];
} {
  const groups = useAppStore((s) => s.data.groups);
  const records = useAppStore((s) => s.data.records);

  return useMemo(() => {
    const valid = validRecords(records);
    const dayLabels = getDayLabels(days);

    const rows = groups.map((group) => {
      const byDay: Record<string, number> = {};
      dayLabels.forEach((k) => (byDay[k] = 0));
      valid
        .filter((r) => r.groupId === group.id)
        .forEach((r) => {
          const k = shortDay(new Date(r.createdAt));
          if (k in byDay) byDay[k] += r.scoreDelta;
        });
      const values = dayLabels.map((k) => byDay[k]);
      return {
        groupName: group.name,
        values,
        total: sumBy(values, (v) => v),
      };
    });

    return { labels: dayLabels, rows };
  }, [groups, records, days]);
}
