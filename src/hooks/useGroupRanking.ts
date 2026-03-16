import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { validRecords, filterByDateRange } from "../utils/helpers";
import type { GroupRankRow, DateRange } from "../types";

export function useGroupRanking(range: DateRange): GroupRankRow[] {
  const students = useAppStore((s) => s.data.students);
  const groups = useAppStore((s) => s.data.groups);
  const records = useAppStore((s) => s.data.records);

  return useMemo(() => {
    const valid = filterByDateRange(validRecords(records), range);
    const map = new Map<string, number>();
    valid.forEach((r) => {
      map.set(r.groupId, (map.get(r.groupId) || 0) + r.scoreDelta);
    });

    return groups
      .map((g) => {
        const count = students.filter(
          (s) => s.active && s.groupId === g.id
        ).length;
        const total = map.get(g.id) || 0;
        return {
          groupId: g.id,
          groupName: g.name,
          score: total,
          members: count,
          avg: count ? (total / count).toFixed(2) : "0.00",
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [students, groups, records, range]);
}
