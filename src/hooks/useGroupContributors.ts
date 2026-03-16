import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  validRecords,
  filterByDateRange,
  withSign,
} from "../utils/helpers";
import type { GroupContribution, DateRange } from "../types";

export function useGroupContributors(range: DateRange): GroupContribution[] {
  const students = useAppStore((s) => s.data.students);
  const groups = useAppStore((s) => s.data.groups);
  const records = useAppStore((s) => s.data.records);

  return useMemo(() => {
    const valid = filterByDateRange(validRecords(records), range);

    return groups.map((group) => {
      const perStudent = new Map<string, number>();
      valid
        .filter((r) => r.groupId === group.id)
        .forEach((r) => {
          perStudent.set(
            r.studentId,
            (perStudent.get(r.studentId) || 0) + r.scoreDelta
          );
        });

      const rows = students
        .filter((s) => s.groupId === group.id)
        .map((s) => ({ name: s.name, score: perStudent.get(s.id) || 0 }));

      const plus = rows
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((r) => `${r.name}(${withSign(r.score)})`)
        .join("、");

      const minus = rows
        .filter((r) => r.score < 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map((r) => `${r.name}(${withSign(r.score)})`)
        .join("、");

      return {
        groupName: group.name,
        plusText: plus,
        minusText: minus,
      };
    });
  }, [students, groups, records, range]);
}
