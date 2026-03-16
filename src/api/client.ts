import type { AppData, ScoreRecord } from "../types";

const BASE = "/api";

async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API 请求失败: ${res.status}`);
  }

  return res.json();
}

// ─── 全量数据 ───

export function fetchAllData(): Promise<AppData> {
  return apiFetch<AppData>("/data");
}

export function importData(data: AppData): Promise<{ ok: boolean }> {
  return apiFetch("/data/import", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function resetData(): Promise<{ ok: boolean }> {
  return apiFetch("/data/reset", { method: "POST" });
}

export function exportData(): Promise<AppData> {
  return apiFetch<AppData>("/data/export");
}

// ─── Students ───

export function apiAddStudent(
  id: string,
  name: string,
  groupId: string,
  sortOrder: number
): Promise<{ ok: boolean }> {
  return apiFetch("/students", {
    method: "POST",
    body: JSON.stringify({ id, name, groupId, sortOrder }),
  });
}

export function apiUpdateStudent(
  id: string,
  name: string,
  groupId: string
): Promise<{ ok: boolean }> {
  return apiFetch(`/students/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, groupId }),
  });
}

export function apiDeleteStudent(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/students/${id}`, { method: "DELETE" });
}

export function apiToggleStudent(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/students/${id}/toggle`, { method: "PATCH" });
}

// ─── Groups ───

export function apiAddGroup(
  id: string,
  name: string,
  sortOrder: number
): Promise<{ ok: boolean }> {
  return apiFetch("/groups", {
    method: "POST",
    body: JSON.stringify({ id, name, sortOrder }),
  });
}

export function apiUpdateGroup(
  id: string,
  name: string
): Promise<{ ok: boolean }> {
  return apiFetch(`/groups/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function apiDeleteGroup(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/groups/${id}`, { method: "DELETE" });
}

export function apiToggleGroup(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/groups/${id}/toggle`, { method: "PATCH" });
}

// ─── Rules ───

export function apiAddRule(
  id: string,
  name: string,
  scoreDelta: number,
  sortOrder: number
): Promise<{ ok: boolean }> {
  return apiFetch("/rules", {
    method: "POST",
    body: JSON.stringify({ id, name, scoreDelta, sortOrder }),
  });
}

export function apiUpdateRule(
  id: string,
  name: string,
  scoreDelta: number
): Promise<{ ok: boolean }> {
  return apiFetch(`/rules/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, scoreDelta }),
  });
}

export function apiDeleteRule(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/rules/${id}`, { method: "DELETE" });
}

export function apiToggleRule(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/rules/${id}/toggle`, { method: "PATCH" });
}

// ─── Records ───

export function apiAddRecord(
  record: ScoreRecord
): Promise<{ ok: boolean }> {
  return apiFetch("/records", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export function apiAddBatchRecords(
  records: ScoreRecord[]
): Promise<{ ok: boolean; count: number }> {
  return apiFetch("/records/batch", {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export function apiUndoLastRecord(): Promise<{ ok: boolean; id?: string }> {
  return apiFetch("/records/undo-last", { method: "POST" });
}

export function apiRevokeRecord(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/records/${id}/revoke`, { method: "PATCH" });
}

export function apiRestoreRecord(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/records/${id}/restore`, { method: "PATCH" });
}

// ─── Settings ───

export function apiUpdatePin(pin: string): Promise<{ ok: boolean }> {
  return apiFetch("/settings/pin", {
    method: "PUT",
    body: JSON.stringify({ pin }),
  });
}
