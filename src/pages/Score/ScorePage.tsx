import { useState, useMemo } from "react";
import Card from "../../components/Card";
import { useAppStore } from "../../store/useAppStore";
import { useUIStore } from "../../store/useUIStore";

export default function ScorePage() {
  const data = useAppStore((s) => s.data);
  const addRecord = useAppStore((s) => s.addRecord);
  const addBatchRecords = useAppStore((s) => s.addBatchRecords);
  const undoLastRecord = useAppStore((s) => s.undoLastRecord);
  const showToast = useUIStore((s) => s.showToast);
  const showScoreAnimation = useUIStore((s) => s.showScoreAnimation);

  const groups = useMemo(() => data.groups.filter((g) => g.active), [data.groups]);
  const rules = useMemo(() => data.rules.filter((r) => r.enabled), [data.rules]);

  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [sortMode, setSortMode] = useState<"group" | "az">("group");

  const students = useMemo(() => {
    const filtered = data.students.filter(
      (s) => s.active && (groupFilter === "all" || s.groupId === groupFilter)
    );
    if (sortMode === "az") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    }
    // 按组排序：先按组 sortOrder，再按学生 sortOrder
    return [...filtered].sort((a, b) => {
      const ga = data.groups.find((g) => g.id === a.groupId);
      const gb = data.groups.find((g) => g.id === b.groupId);
      const gOrder = (ga?.sortOrder ?? 0) - (gb?.sortOrder ?? 0);
      if (gOrder !== 0) return gOrder;
      return a.sortOrder - b.sortOrder;
    });
  }, [data.students, data.groups, groupFilter, sortMode]);

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  const handleStudentClick = (id: string) => {
    if (batchMode) {
      setSelectedStudents((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    } else {
      setSelectedStudents([id]);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    const groupStudentIds = students
      .filter((s) => s.groupId === groupId)
      .map((s) => s.id);
    const allSelected = groupStudentIds.every((id) =>
      selectedStudents.includes(id)
    );
    if (allSelected) {
      setSelectedStudents((prev) =>
        prev.filter((id) => !groupStudentIds.includes(id))
      );
    } else {
      setSelectedStudents((prev) => [
        ...new Set([...prev, ...groupStudentIds]),
      ]);
    }
  };

  const handleSubmit = () => {
    if (selectedStudents.length === 0) {
      showToast("请先选择学生");
      return;
    }
    if (!selectedRuleId || !selectedRule) {
      showToast("请先选择规则");
      return;
    }

    if (batchMode && selectedStudents.length > 1) {
      const count = addBatchRecords(selectedStudents, selectedRuleId);
      if (count > 0) {
        const icon = selectedRule.scoreDelta > 0 ? "✅" : "⚠️";
        showToast(`${icon} 已为 ${count} 名学生 ${selectedRule.scoreDelta > 0 ? "加" : "扣"} ${Math.abs(selectedRule.scoreDelta)} 分`);
        showScoreAnimation(
          `${selectedRule.scoreDelta > 0 ? "+" : ""}${selectedRule.scoreDelta} 分`,
          selectedRule.scoreDelta > 0
        );
      }
    } else {
      const student = data.students.find((s) => s.id === selectedStudents[0]);
      const record = addRecord(selectedStudents[0], selectedRuleId);
      if (record && student) {
        const group = groups.find((g) => g.id === student.groupId);
        const icon = selectedRule.scoreDelta > 0 ? "✅" : "⚠️";
        showToast(
          `${icon} ${student.name} ${selectedRule.scoreDelta > 0 ? "+" : ""}${selectedRule.scoreDelta} 分 (${group?.name || "未分组"})`
        );
        showScoreAnimation(
          `${selectedRule.scoreDelta > 0 ? "+" : ""}${selectedRule.scoreDelta} 分`,
          selectedRule.scoreDelta > 0
        );
      }
    }

    setSelectedRuleId(null);
    if (!batchMode) setSelectedStudents([]);
  };

  const handleClear = () => {
    setSelectedStudents([]);
    setSelectedRuleId(null);
  };

  const handleUndo = () => {
    const ok = undoLastRecord();
    showToast(ok ? "↩️ 已撤销上一条" : "没有5分钟内可撤销的记录");
  };

  const plusRules = rules.filter((r) => r.scoreDelta > 0);
  const minusRules = rules.filter((r) => r.scoreDelta < 0);

  return (
    <div className="score-page">
      <Card className="score-tip-card">
        <div className="score-header">
          <h2>✏️ 快速记分</h2>
          <label className="batch-toggle">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(e) => {
                setBatchMode(e.target.checked);
                setSelectedStudents([]);
              }}
            />
            <span className="toggle-label">👥 批量模式</span>
          </label>
        </div>
        <p className="muted">
          {batchMode
            ? "批量模式：可多选学生，选择规则后一次性提交"
            : "选学生 👉 选规则 👉 提交，就这么简单！"}
        </p>
      </Card>

      {(selectedStudents.length > 0 || selectedRule) && (
        <Card className="selection-preview">
          <div className="preview-content">
            <div className="preview-item">
              <span className="preview-icon">👤</span>
              <span className="preview-text">
                {selectedStudents.length > 0
                  ? batchMode
                    ? `已选 ${selectedStudents.length} 人`
                    : data.students.find((s) => s.id === selectedStudents[0])?.name || "-"
                  : "未选择"}
              </span>
            </div>
            <span className="preview-arrow">→</span>
            <div className="preview-item">
              <span className="preview-icon">{selectedRule ? (selectedRule.scoreDelta > 0 ? "⬆️" : "⬇️") : "📋"}</span>
              <span className="preview-text">
                {selectedRule
                  ? `${selectedRule.name} (${selectedRule.scoreDelta > 0 ? "+" : ""}${selectedRule.scoreDelta}分)`
                  : "未选择"}
              </span>
            </div>
            <button className="btn-submit-big" onClick={handleSubmit} disabled={selectedStudents.length === 0 || !selectedRule}>
              ✅ 提交
            </button>
          </div>
        </Card>
      )}

      <div className="score-layout" style={{ marginTop: 12 }}>
        <Card>
          <div className="select-line">
            <h3 style={{ margin: 0 }}>👤 选择学生</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={groupFilter}
                onChange={(e) => {
                  setGroupFilter(e.target.value);
                  setSelectedStudents([]);
                }}
              >
                <option value="all">全部小组</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as "group" | "az")}
              >
                <option value="group">按组排列</option>
                <option value="az">按拼音 A-Z</option>
              </select>
            </div>
          </div>

          {batchMode && (
            <div className="group-quick-select">
              {groups
                .filter((g) => groupFilter === "all" || g.id === groupFilter)
                .map((g) => (
                  <button key={g.id} className="btn-group-select" onClick={() => handleSelectGroup(g.id)}>
                    👥 全选{g.name}
                  </button>
                ))}
            </div>
          )}

          <div className="student-grid">
            {students.length > 0 ? (
              students.map((s) => {
                const group = groups.find((g) => g.id === s.groupId);
                return (
                  <button
                    key={s.id}
                    className={`student-btn ${selectedStudents.includes(s.id) ? "active" : ""}`}
                    onClick={() => handleStudentClick(s.id)}
                  >
                    <span className="student-avatar">
                      {selectedStudents.includes(s.id) ? "✅" : "👤"}
                    </span>
                    <span className="student-name">{s.name}</span>
                    <span className="student-group-tag">{group?.name}</span>
                  </button>
                );
              })
            ) : (
              <p className="muted">当前筛选无学生</p>
            )}
          </div>
        </Card>

        <Card>
          {plusRules.length > 0 && (
            <>
              <h3>⬆️ 加分规则</h3>
              <div className="rule-grid">
                {plusRules.map((r) => (
                  <button
                    key={r.id}
                    className={`rule-btn rule-plus ${selectedRuleId === r.id ? "active" : ""}`}
                    onClick={() => setSelectedRuleId(r.id)}
                  >
                    <span className="rule-icon">⬆️</span>
                    <span className="rule-name">{r.name}</span>
                    <span className="rule-delta positive">+{r.scoreDelta}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {minusRules.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>⬇️ 扣分规则</h3>
              <div className="rule-grid">
                {minusRules.map((r) => (
                  <button
                    key={r.id}
                    className={`rule-btn rule-minus ${selectedRuleId === r.id ? "active" : ""}`}
                    onClick={() => setSelectedRuleId(r.id)}
                  >
                    <span className="rule-icon">⬇️</span>
                    <span className="rule-name">{r.name}</span>
                    <span className="rule-delta negative">{r.scoreDelta}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {rules.length === 0 && <p className="muted">暂无启用规则</p>}

          <div className="score-actions">
            <button className="btn-primary btn-lg" onClick={handleSubmit}>
              ✅ 提交记分
            </button>
            <button className="btn-muted" onClick={handleClear}>
              🔄 清空选择
            </button>
            <button className="btn-danger" onClick={handleUndo}>
              ↩️ 撤销上一条
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
