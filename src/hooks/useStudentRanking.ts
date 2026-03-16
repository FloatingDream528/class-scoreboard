import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { validRecords, filterByDateRange } from "../utils/helpers";
import type { StudentRankRow, DateRange } from "../types";

export function useStudentRanking(range: DateRange): StudentRankRow[] {
  const students = useAppStore((s) => s.data.students);
  const groups = useAppStore((s) => s.data.groups);
  const records = useAppStore((s) => s.data.records);

  return useMemo(() => {
    const valid = filterByDateRange(validRecords(records), range);
    const map = new Map<string, number>();
    valid.forEach((r) => {
      map.set(r.studentId, (map.get(r.studentId) || 0) + r.scoreDelta);
    });

    return students
      .map((s) => {
        const group = groups.find((g) => g.id === s.groupId);
        return {
          studentId: s.id,
          studentName: s.name,
          groupName: group ? group.name : "-",
          score: map.get(s.id) || 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [students, groups, records, range]);
}
