import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { validRecords, filterByDateRange, sumBy } from "../utils/helpers";
import type { Summary } from "../types";

export function useSummary(): Summary {
  const records = useAppStore((s) => s.data.records);

  return useMemo(() => {
    const valid = validRecords(records);
    return {
      totalScore: sumBy(valid, (r) => r.scoreDelta),
      todayScore: sumBy(filterByDateRange(valid, "today"), (r) => r.scoreDelta),
      weekScore: sumBy(filterByDateRange(valid, "week"), (r) => r.scoreDelta),
      validRecords: valid.length,
    };
  }, [records]);
}
