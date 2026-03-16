import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type {
  Group,
  Student,
  Rule,
  ScoreRecord,
  Settings,
  AppData,
} from "../src/types";

// ─── 初始化数据库 ───

const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "scoreboard.db");
const db = new Database(DB_PATH);

// 启用 WAL 模式提升并发性能
db.pragma("journal_mode = WAL");

// ─── 建表 ───

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    active     INTEGER NOT NULL DEFAULT 1,
    sortOrder  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS students (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    groupId    TEXT NOT NULL,
    active     INTEGER NOT NULL DEFAULT 1,
    sortOrder  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rules (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    scoreDelta INTEGER NOT NULL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    sortOrder  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS records (
    id         TEXT PRIMARY KEY,
    studentId  TEXT NOT NULL,
    groupId    TEXT NOT NULL,
    ruleId     TEXT NOT NULL,
    scoreDelta INTEGER NOT NULL,
    createdAt  TEXT NOT NULL,
    revoked    INTEGER NOT NULL DEFAULT 0,
    revokedAt  TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ─── 辅助：布尔转换 ───

function boolToInt(v: boolean): number {
  return v ? 1 : 0;
}

// ─── Seed 数据 ───

function seedIfEmpty(): void {
  const count = db
    .prepare("SELECT COUNT(*) as c FROM groups")
    .get() as { c: number };
  if (count.c > 0) return;

  const now = new Date();

  const groups: Group[] = [
    { id: "g1", name: "一组", active: true, sortOrder: 1 },
    { id: "g2", name: "二组", active: true, sortOrder: 2 },
    { id: "g3", name: "三组", active: true, sortOrder: 3 },
  ];

  const students: Student[] = [
    { id: "s1", name: "张三", groupId: "g1", active: true, sortOrder: 1 },
    { id: "s2", name: "李四", groupId: "g1", active: true, sortOrder: 2 },
    { id: "s3", name: "王五", groupId: "g2", active: true, sortOrder: 3 },
    { id: "s4", name: "赵六", groupId: "g2", active: true, sortOrder: 4 },
    { id: "s5", name: "陈明", groupId: "g3", active: true, sortOrder: 5 },
    { id: "s6", name: "刘洋", groupId: "g3", active: true, sortOrder: 6 },
  ];

  const rules: Rule[] = [
    { id: "r1", name: "作业优秀", scoreDelta: 2, enabled: true, sortOrder: 1 },
    { id: "r2", name: "课堂发言", scoreDelta: 1, enabled: true, sortOrder: 2 },
    { id: "r3", name: "迟到", scoreDelta: -1, enabled: true, sortOrder: 3 },
    { id: "r4", name: "值日优秀", scoreDelta: 1, enabled: true, sortOrder: 4 },
  ];

  const records: ScoreRecord[] = [
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
  ];

  const insertGroup = db.prepare(
    "INSERT INTO groups (id, name, active, sortOrder) VALUES (?, ?, ?, ?)"
  );
  const insertStudent = db.prepare(
    "INSERT INTO students (id, name, groupId, active, sortOrder) VALUES (?, ?, ?, ?, ?)"
  );
  const insertRule = db.prepare(
    "INSERT INTO rules (id, name, scoreDelta, enabled, sortOrder) VALUES (?, ?, ?, ?, ?)"
  );
  const insertRecord = db.prepare(
    "INSERT INTO records (id, studentId, groupId, ruleId, scoreDelta, createdAt, revoked, revokedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const seed = db.transaction(() => {
    for (const g of groups)
      insertGroup.run(g.id, g.name, boolToInt(g.active), g.sortOrder);
    for (const s of students)
      insertStudent.run(
        s.id,
        s.name,
        s.groupId,
        boolToInt(s.active),
        s.sortOrder
      );
    for (const r of rules)
      insertRule.run(
        r.id,
        r.name,
        r.scoreDelta,
        boolToInt(r.enabled),
        r.sortOrder
      );
    for (const rec of records)
      insertRecord.run(
        rec.id,
        rec.studentId,
        rec.groupId,
        rec.ruleId,
        rec.scoreDelta,
        rec.createdAt,
        boolToInt(rec.revoked),
        rec.revokedAt || null
      );
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('managePin', '1234')"
    ).run();
  });

  seed();
  console.log("[db] Seed data inserted");
}

seedIfEmpty();

// ─── 查询：获取全量数据 ───

export function getAllData(): AppData {
  const groups = db.prepare("SELECT * FROM groups ORDER BY sortOrder").all() as Array<{
    id: string;
    name: string;
    active: number;
    sortOrder: number;
  }>;
  const students = db
    .prepare("SELECT * FROM students ORDER BY sortOrder")
    .all() as Array<{
    id: string;
    name: string;
    groupId: string;
    active: number;
    sortOrder: number;
  }>;
  const rules = db.prepare("SELECT * FROM rules ORDER BY sortOrder").all() as Array<{
    id: string;
    name: string;
    scoreDelta: number;
    enabled: number;
    sortOrder: number;
  }>;
  const records = db
    .prepare("SELECT * FROM records ORDER BY createdAt DESC")
    .all() as Array<{
    id: string;
    studentId: string;
    groupId: string;
    ruleId: string;
    scoreDelta: number;
    createdAt: string;
    revoked: number;
    revokedAt: string | null;
  }>;

  const pinRow = db
    .prepare("SELECT value FROM settings WHERE key = 'managePin'")
    .get() as { value: string } | undefined;

  return {
    groups: groups.map((g) => ({
      ...g,
      active: g.active === 1,
    })),
    students: students.map((s) => ({
      ...s,
      active: s.active === 1,
    })),
    rules: rules.map((r) => ({
      ...r,
      enabled: r.enabled === 1,
    })),
    records: records.map((r) => ({
      ...r,
      revoked: r.revoked === 1,
      revokedAt: r.revokedAt || undefined,
    })),
    settings: {
      managePin: pinRow?.value || "1234",
    },
  };
}

// ─── 导入全量数据 ───

export function importData(data: AppData): void {
  const tx = db.transaction(() => {
    db.exec("DELETE FROM records");
    db.exec("DELETE FROM students");
    db.exec("DELETE FROM groups");
    db.exec("DELETE FROM rules");
    db.exec("DELETE FROM settings");

    const insertGroup = db.prepare(
      "INSERT INTO groups (id, name, active, sortOrder) VALUES (?, ?, ?, ?)"
    );
    const insertStudent = db.prepare(
      "INSERT INTO students (id, name, groupId, active, sortOrder) VALUES (?, ?, ?, ?, ?)"
    );
    const insertRule = db.prepare(
      "INSERT INTO rules (id, name, scoreDelta, enabled, sortOrder) VALUES (?, ?, ?, ?, ?)"
    );
    const insertRecord = db.prepare(
      "INSERT INTO records (id, studentId, groupId, ruleId, scoreDelta, createdAt, revoked, revokedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );

    for (const g of data.groups)
      insertGroup.run(g.id, g.name, boolToInt(g.active), g.sortOrder);
    for (const s of data.students)
      insertStudent.run(
        s.id,
        s.name,
        s.groupId,
        boolToInt(s.active),
        s.sortOrder
      );
    for (const r of data.rules)
      insertRule.run(
        r.id,
        r.name,
        r.scoreDelta,
        boolToInt(r.enabled),
        r.sortOrder
      );
    for (const rec of data.records)
      insertRecord.run(
        rec.id,
        rec.studentId,
        rec.groupId,
        rec.ruleId,
        rec.scoreDelta,
        rec.createdAt,
        boolToInt(rec.revoked),
        rec.revokedAt || null
      );

    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('managePin', ?)"
    ).run(data.settings.managePin);
  });

  tx();
}

// ─── 重置为 seed ───

export function resetToSeed(): void {
  db.exec("DELETE FROM records");
  db.exec("DELETE FROM students");
  db.exec("DELETE FROM groups");
  db.exec("DELETE FROM rules");
  db.exec("DELETE FROM settings");
  seedIfEmpty();
}

// ─── Students CRUD ───

export function addStudent(
  id: string,
  name: string,
  groupId: string,
  sortOrder: number
): void {
  db.prepare(
    "INSERT INTO students (id, name, groupId, active, sortOrder) VALUES (?, ?, ?, 1, ?)"
  ).run(id, name, groupId, sortOrder);
}

export function updateStudent(
  id: string,
  name: string,
  groupId: string
): void {
  db.prepare("UPDATE students SET name = ?, groupId = ? WHERE id = ?").run(
    name,
    groupId,
    id
  );
}

export function deleteStudent(id: string): void {
  db.prepare("DELETE FROM students WHERE id = ?").run(id);
}

export function toggleStudent(id: string): void {
  db.prepare("UPDATE students SET active = 1 - active WHERE id = ?").run(id);
}

export function getStudentCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM students")
    .get() as { c: number };
  return row.c;
}

// ─── Groups CRUD ───

export function addGroup(
  id: string,
  name: string,
  sortOrder: number
): void {
  db.prepare(
    "INSERT INTO groups (id, name, active, sortOrder) VALUES (?, ?, 1, ?)"
  ).run(id, name, sortOrder);
}

export function updateGroup(id: string, name: string): void {
  db.prepare("UPDATE groups SET name = ? WHERE id = ?").run(name, id);
}

export function deleteGroup(id: string): void {
  db.prepare("DELETE FROM groups WHERE id = ?").run(id);
}

export function toggleGroup(id: string): void {
  db.prepare("UPDATE groups SET active = 1 - active WHERE id = ?").run(id);
}

export function getGroupCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM groups")
    .get() as { c: number };
  return row.c;
}

// ─── Rules CRUD ───

export function addRule(
  id: string,
  name: string,
  scoreDelta: number,
  sortOrder: number
): void {
  db.prepare(
    "INSERT INTO rules (id, name, scoreDelta, enabled, sortOrder) VALUES (?, ?, ?, 1, ?)"
  ).run(id, name, scoreDelta, sortOrder);
}

export function updateRule(
  id: string,
  name: string,
  scoreDelta: number
): void {
  db.prepare("UPDATE rules SET name = ?, scoreDelta = ? WHERE id = ?").run(
    name,
    scoreDelta,
    id
  );
}

export function deleteRule(id: string): void {
  db.prepare("DELETE FROM rules WHERE id = ?").run(id);
}

export function toggleRule(id: string): void {
  db.prepare("UPDATE rules SET enabled = 1 - enabled WHERE id = ?").run(id);
}

export function getRuleCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM rules")
    .get() as { c: number };
  return row.c;
}

// ─── Records ───

export function addRecord(record: ScoreRecord): void {
  db.prepare(
    "INSERT INTO records (id, studentId, groupId, ruleId, scoreDelta, createdAt, revoked, revokedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    record.id,
    record.studentId,
    record.groupId,
    record.ruleId,
    record.scoreDelta,
    record.createdAt,
    boolToInt(record.revoked),
    record.revokedAt || null
  );
}

export function addBatchRecords(records: ScoreRecord[]): void {
  const insert = db.prepare(
    "INSERT INTO records (id, studentId, groupId, ruleId, scoreDelta, createdAt, revoked, revokedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const r of records) {
      insert.run(
        r.id,
        r.studentId,
        r.groupId,
        r.ruleId,
        r.scoreDelta,
        r.createdAt,
        boolToInt(r.revoked),
        r.revokedAt || null
      );
    }
  });
  tx();
}

export function revokeRecord(id: string): boolean {
  const result = db
    .prepare(
      "UPDATE records SET revoked = 1, revokedAt = ? WHERE id = ? AND revoked = 0"
    )
    .run(new Date().toISOString(), id);
  return result.changes > 0;
}

export function restoreRecord(id: string): boolean {
  const result = db
    .prepare(
      "UPDATE records SET revoked = 0, revokedAt = NULL WHERE id = ? AND revoked = 1"
    )
    .run(id);
  return result.changes > 0;
}

export function undoLastRecord(): { success: boolean; id?: string } {
  const UNDO_WINDOW_MS = 5 * 60 * 1000;
  const latest = db
    .prepare(
      "SELECT id, createdAt FROM records WHERE revoked = 0 ORDER BY createdAt DESC LIMIT 1"
    )
    .get() as { id: string; createdAt: string } | undefined;

  if (!latest) return { success: false };

  const elapsed = Date.now() - new Date(latest.createdAt).getTime();
  if (elapsed > UNDO_WINDOW_MS) return { success: false };

  const result = db
    .prepare(
      "UPDATE records SET revoked = 1, revokedAt = ? WHERE id = ?"
    )
    .run(new Date().toISOString(), latest.id);

  return { success: result.changes > 0, id: latest.id };
}

// ─── Settings ───

export function updatePin(pin: string): boolean {
  if (!/^\d{4,6}$/.test(pin)) return false;
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('managePin', ?)"
  ).run(pin);
  return true;
}

// ─── 获取单个实体（用于验证） ───

export function getStudent(id: string) {
  return db.prepare("SELECT * FROM students WHERE id = ?").get(id) as
    | { id: string; name: string; groupId: string; active: number; sortOrder: number }
    | undefined;
}

export function getRule(id: string) {
  return db.prepare("SELECT * FROM rules WHERE id = ?").get(id) as
    | { id: string; name: string; scoreDelta: number; enabled: number; sortOrder: number }
    | undefined;
}

export function getStudentsInGroup(groupId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM students WHERE groupId = ?")
    .get(groupId) as { c: number };
  return row.c;
}

export default db;
