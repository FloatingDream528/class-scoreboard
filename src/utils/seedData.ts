import type { AppData } from "../types";

const DEFAULT_PIN = "1234";

export function seedData(): AppData {
  const now = new Date();
  return {
    groups: [
      { id: "g1", name: "一组", active: true, sortOrder: 1 },
      { id: "g2", name: "二组", active: true, sortOrder: 2 },
      { id: "g3", name: "三组", active: true, sortOrder: 3 },
    ],
    students: [
      { id: "s1", name: "张三", groupId: "g1", active: true, sortOrder: 1 },
      { id: "s2", name: "李四", groupId: "g1", active: true, sortOrder: 2 },
      { id: "s3", name: "王五", groupId: "g2", active: true, sortOrder: 3 },
      { id: "s4", name: "赵六", groupId: "g2", active: true, sortOrder: 4 },
      { id: "s5", name: "陈明", groupId: "g3", active: true, sortOrder: 5 },
      { id: "s6", name: "刘洋", groupId: "g3", active: true, sortOrder: 6 },
    ],
    rules: [
      { id: "r1", name: "作业优秀", scoreDelta: 2, enabled: true, sortOrder: 1 },
      { id: "r2", name: "课堂发言", scoreDelta: 1, enabled: true, sortOrder: 2 },
      { id: "r3", name: "迟到", scoreDelta: -1, enabled: true, sortOrder: 3 },
      { id: "r4", name: "值日优秀", scoreDelta: 1, enabled: true, sortOrder: 4 },
    ],
    records: [
      {
        id: "rec1",
        studentId: "s1",
        groupId: "g1",
        ruleId: "r1",
        scoreDelta: 2,
        createdAt: new Date(now.getTime() - 3600 * 1000 * 5).toISOString(),
        revoked: false,
      },
      {
        id: "rec2",
        studentId: "s3",
        groupId: "g2",
        ruleId: "r2",
        scoreDelta: 1,
        createdAt: new Date(now.getTime() - 3600 * 1000 * 20).toISOString(),
        revoked: false,
      },
      {
        id: "rec3",
        studentId: "s5",
        groupId: "g3",
        ruleId: "r3",
        scoreDelta: -1,
        createdAt: new Date(now.getTime() - 3600 * 1000 * 30).toISOString(),
        revoked: false,
      },
    ],
    settings: { managePin: DEFAULT_PIN },
  };
}
