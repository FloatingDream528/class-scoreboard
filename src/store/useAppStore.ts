import { create } from "zustand";
import type { AppData, ScoreRecord } from "../types";
import { idOf } from "../utils/helpers";
import { seedData } from "../utils/seedData";
import * as api from "../api/client";

interface AppStore {
  data: AppData;
  loading: boolean;

  // 从服务端拉取全量数据
  fetchAllData: () => Promise<void>;

  // Record actions
  addRecord: (studentId: string, ruleId: string) => ScoreRecord | null;
  addBatchRecords: (studentIds: string[], ruleId: string) => number;
  undoLastRecord: () => boolean;
  revokeRecord: (id: string) => boolean;
  restoreRecord: (id: string) => boolean;

  // Student actions
  addStudent: (name: string, groupId: string) => void;
  updateStudent: (id: string, name: string, groupId: string) => void;
  deleteStudent: (id: string) => void;
  toggleStudent: (id: string) => void;

  // Group actions
  addGroup: (name: string) => void;
  updateGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  toggleGroup: (id: string) => void;

  // Rule actions
  addRule: (name: string, scoreDelta: number) => void;
  updateRule: (id: string, name: string, scoreDelta: number) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;

  // Settings
  updatePin: (pin: string) => boolean;
  resetToSeed: () => void;
  importData: (json: string) => boolean;
}

/** 后台调 API，失败时 console.warn（乐观更新，不回滚） */
function fireAndForget(promise: Promise<unknown>) {
  promise.catch((err) => console.warn("[API]", err));
}

export const useAppStore = create<AppStore>()((set, get) => ({
  data: seedData(), // 初始占位，fetchAllData 后会被覆盖
  loading: true,

  fetchAllData: async () => {
    try {
      const data = await api.fetchAllData();
      set({ data, loading: false });
    } catch (err) {
      console.warn("[fetchAllData]", err);
      set({ loading: false });
    }
  },

  addRecord: (studentId, ruleId) => {
    const { data } = get();
    const student = data.students.find((s) => s.id === studentId);
    const rule = data.rules.find((r) => r.id === ruleId);
    if (!student || !student.active || !rule || !rule.enabled) return null;

    const record: ScoreRecord = {
      id: idOf("rec"),
      studentId: student.id,
      groupId: student.groupId,
      ruleId: rule.id,
      scoreDelta: rule.scoreDelta,
      createdAt: new Date().toISOString(),
      revoked: false,
    };

    // 乐观更新
    set((state) => ({
      data: {
        ...state.data,
        records: [...state.data.records, record],
      },
    }));

    fireAndForget(api.apiAddRecord(record));
    return record;
  },

  addBatchRecords: (studentIds, ruleId) => {
    const { data } = get();
    const rule = data.rules.find((r) => r.id === ruleId);
    if (!rule || !rule.enabled) return 0;

    const newRecords: ScoreRecord[] = [];
    for (const sid of studentIds) {
      const student = data.students.find((s) => s.id === sid);
      if (!student || !student.active) continue;
      newRecords.push({
        id: idOf("rec"),
        studentId: student.id,
        groupId: student.groupId,
        ruleId: rule.id,
        scoreDelta: rule.scoreDelta,
        createdAt: new Date().toISOString(),
        revoked: false,
      });
    }

    if (newRecords.length === 0) return 0;

    set((state) => ({
      data: {
        ...state.data,
        records: [...state.data.records, ...newRecords],
      },
    }));

    fireAndForget(api.apiAddBatchRecords(newRecords));
    return newRecords.length;
  },

  undoLastRecord: () => {
    const { data } = get();
    const now = Date.now();
    const UNDO_WINDOW_MS = 5 * 60 * 1000;

    const validSorted = data.records
      .filter((r) => !r.revoked)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    if (validSorted.length === 0) return false;

    const latest = validSorted[0];
    const elapsed = now - new Date(latest.createdAt).getTime();
    if (elapsed > UNDO_WINDOW_MS) return false;

    set((state) => ({
      data: {
        ...state.data,
        records: state.data.records.map((r) =>
          r.id === latest.id
            ? { ...r, revoked: true, revokedAt: new Date().toISOString() }
            : r
        ),
      },
    }));

    fireAndForget(api.apiUndoLastRecord());
    return true;
  },

  revokeRecord: (id) => {
    const { data } = get();
    const target = data.records.find((r) => r.id === id);
    if (!target || target.revoked) return false;

    set((state) => ({
      data: {
        ...state.data,
        records: state.data.records.map((r) =>
          r.id === id
            ? { ...r, revoked: true, revokedAt: new Date().toISOString() }
            : r
        ),
      },
    }));

    fireAndForget(api.apiRevokeRecord(id));
    return true;
  },

  restoreRecord: (id) => {
    const { data } = get();
    const target = data.records.find((r) => r.id === id);
    if (!target || !target.revoked) return false;

    set((state) => ({
      data: {
        ...state.data,
        records: state.data.records.map((r) =>
          r.id === id ? { ...r, revoked: false, revokedAt: null } : r
        ),
      },
    }));

    fireAndForget(api.apiRestoreRecord(id));
    return true;
  },

  addStudent: (name, groupId) => {
    const id = idOf("stu");
    const sortOrder = get().data.students.length + 1;

    set((state) => ({
      data: {
        ...state.data,
        students: [
          ...state.data.students,
          { id, name, groupId, active: true, sortOrder },
        ],
      },
    }));

    fireAndForget(api.apiAddStudent(id, name, groupId, sortOrder));
  },

  updateStudent: (id, name, groupId) => {
    set((state) => ({
      data: {
        ...state.data,
        students: state.data.students.map((s) =>
          s.id === id ? { ...s, name, groupId } : s
        ),
      },
    }));

    fireAndForget(api.apiUpdateStudent(id, name, groupId));
  },

  deleteStudent: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        students: state.data.students.filter((s) => s.id !== id),
      },
    }));

    fireAndForget(api.apiDeleteStudent(id));
  },

  toggleStudent: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        students: state.data.students.map((s) =>
          s.id === id ? { ...s, active: !s.active } : s
        ),
      },
    }));

    fireAndForget(api.apiToggleStudent(id));
  },

  addGroup: (name) => {
    const id = idOf("grp");
    const sortOrder = get().data.groups.length + 1;

    set((state) => ({
      data: {
        ...state.data,
        groups: [
          ...state.data.groups,
          { id, name, active: true, sortOrder },
        ],
      },
    }));

    fireAndForget(api.apiAddGroup(id, name, sortOrder));
  },

  updateGroup: (id, name) => {
    set((state) => ({
      data: {
        ...state.data,
        groups: state.data.groups.map((g) =>
          g.id === id ? { ...g, name } : g
        ),
      },
    }));

    fireAndForget(api.apiUpdateGroup(id, name));
  },

  deleteGroup: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        groups: state.data.groups.filter((g) => g.id !== id),
      },
    }));

    fireAndForget(api.apiDeleteGroup(id));
  },

  toggleGroup: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        groups: state.data.groups.map((g) =>
          g.id === id ? { ...g, active: !g.active } : g
        ),
      },
    }));

    fireAndForget(api.apiToggleGroup(id));
  },

  addRule: (name, scoreDelta) => {
    const id = idOf("rule");
    const sortOrder = get().data.rules.length + 1;

    set((state) => ({
      data: {
        ...state.data,
        rules: [
          ...state.data.rules,
          { id, name, scoreDelta, enabled: true, sortOrder },
        ],
      },
    }));

    fireAndForget(api.apiAddRule(id, name, scoreDelta, sortOrder));
  },

  updateRule: (id, name, scoreDelta) => {
    set((state) => ({
      data: {
        ...state.data,
        rules: state.data.rules.map((r) =>
          r.id === id ? { ...r, name, scoreDelta } : r
        ),
      },
    }));

    fireAndForget(api.apiUpdateRule(id, name, scoreDelta));
  },

  deleteRule: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        rules: state.data.rules.filter((r) => r.id !== id),
      },
    }));

    fireAndForget(api.apiDeleteRule(id));
  },

  toggleRule: (id) => {
    set((state) => ({
      data: {
        ...state.data,
        rules: state.data.rules.map((r) =>
          r.id === id ? { ...r, enabled: !r.enabled } : r
        ),
      },
    }));

    fireAndForget(api.apiToggleRule(id));
  },

  updatePin: (pin) => {
    if (!/^\d{4,6}$/.test(pin)) return false;
    set((state) => ({
      data: {
        ...state.data,
        settings: { ...state.data.settings, managePin: pin },
      },
    }));

    fireAndForget(api.apiUpdatePin(pin));
    return true;
  },

  resetToSeed: () => {
    set({ data: seedData() });
    fireAndForget(api.resetData().then(() => get().fetchAllData()));
  },

  importData: (json) => {
    try {
      const parsed = JSON.parse(json);
      if (
        !parsed.groups ||
        !parsed.students ||
        !parsed.rules ||
        !parsed.records
      )
        return false;
      if (!parsed.settings) parsed.settings = { managePin: "1234" };
      set({ data: parsed });
      fireAndForget(api.importData(parsed));
      return true;
    } catch {
      return false;
    }
  },
}));
