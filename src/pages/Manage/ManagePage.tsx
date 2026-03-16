import { useState, useMemo } from "react";
import Card from "../../components/Card";
import { useAppStore } from "../../store/useAppStore";
import { useUIStore } from "../../store/useUIStore";
import { findById, fmtTime } from "../../utils/helpers";

type LogFilter = "all" | "valid" | "revoked";

export default function ManagePage() {
  const data = useAppStore((s) => s.data);
  const addStudent = useAppStore((s) => s.addStudent);
  const updateStudent = useAppStore((s) => s.updateStudent);
  const deleteStudent = useAppStore((s) => s.deleteStudent);
  const toggleStudent = useAppStore((s) => s.toggleStudent);
  const addGroup = useAppStore((s) => s.addGroup);
  const updateGroup = useAppStore((s) => s.updateGroup);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const toggleGroup = useAppStore((s) => s.toggleGroup);
  const addRule = useAppStore((s) => s.addRule);
  const updateRule = useAppStore((s) => s.updateRule);
  const deleteRule = useAppStore((s) => s.deleteRule);
  const toggleRule = useAppStore((s) => s.toggleRule);
  const updatePin = useAppStore((s) => s.updatePin);
  const resetToSeed = useAppStore((s) => s.resetToSeed);
  const importData = useAppStore((s) => s.importData);
  const revokeRecord = useAppStore((s) => s.revokeRecord);
  const restoreRecord = useAppStore((s) => s.restoreRecord);
  const showToast = useUIStore((s) => s.showToast);

  // Add form state
  const [studentName, setStudentName] = useState("");
  const [studentGroup, setStudentGroup] = useState(data.groups[0]?.id || "");
  const [groupName, setGroupName] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [ruleScore, setRuleScore] = useState("");
  const [newPin, setNewPin] = useState("");

  // Edit state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentGroup, setEditStudentGroup] = useState("");

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleName, setEditRuleName] = useState("");
  const [editRuleScore, setEditRuleScore] = useState("");

  // Audit log state
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [logStudentFilter, setLogStudentFilter] = useState("all");
  const [logGroupFilter, setLogGroupFilter] = useState("all");
  const [logPage, setLogPage] = useState(0);
  const LOG_PAGE_SIZE = 30;

  const sortedStudents = [...data.students].sort((a, b) => {
    if (a.groupId === b.groupId) return (a.sortOrder || 0) - (b.sortOrder || 0);
    return String(a.groupId).localeCompare(String(b.groupId));
  });

  // Audit log
  const filteredLogs = useMemo(() => {
    let records = [...data.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (logFilter === "valid") records = records.filter((r) => !r.revoked);
    if (logFilter === "revoked") records = records.filter((r) => r.revoked);
    if (logStudentFilter !== "all")
      records = records.filter((r) => r.studentId === logStudentFilter);
    if (logGroupFilter !== "all")
      records = records.filter((r) => r.groupId === logGroupFilter);
    return records;
  }, [data.records, logFilter, logStudentFilter, logGroupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOG_PAGE_SIZE));
  const pagedLogs = filteredLogs.slice(logPage * LOG_PAGE_SIZE, (logPage + 1) * LOG_PAGE_SIZE);

  const logStats = useMemo(() => {
    const total = data.records.length;
    const revoked = data.records.filter((r) => r.revoked).length;
    return { total, valid: total - revoked, revoked };
  }, [data.records]);

  // ─── Handlers ───

  const handleRevokeRecord = (id: string) => {
    showToast(revokeRecord(id) ? "↩️ 已撤回该记录" : "撤回失败");
  };
  const handleRestoreRecord = (id: string) => {
    showToast(restoreRecord(id) ? "✅ 已恢复该记录" : "恢复失败");
  };

  const handleAddStudent = () => {
    if (!studentName.trim()) return showToast("请输入学生姓名");
    addStudent(studentName.trim(), studentGroup);
    setStudentName("");
    showToast("✅ 已添加学生");
  };

  const startEditStudent = (id: string) => {
    const s = data.students.find((x) => x.id === id);
    if (!s) return;
    setEditingStudentId(id);
    setEditStudentName(s.name);
    setEditStudentGroup(s.groupId);
  };
  const saveEditStudent = () => {
    if (!editingStudentId || !editStudentName.trim()) return;
    updateStudent(editingStudentId, editStudentName.trim(), editStudentGroup);
    setEditingStudentId(null);
    showToast("✅ 学生已更新");
  };
  const handleDeleteStudent = (id: string, name: string) => {
    if (!window.confirm(`确定删除学生「${name}」？相关积分记录不会被删除。`)) return;
    deleteStudent(id);
    showToast("已删除学生");
  };

  const handleAddGroup = () => {
    if (!groupName.trim()) return showToast("请输入小组名");
    addGroup(groupName.trim());
    setGroupName("");
    showToast("✅ 已添加小组");
  };

  const startEditGroup = (id: string) => {
    const g = data.groups.find((x) => x.id === id);
    if (!g) return;
    setEditingGroupId(id);
    setEditGroupName(g.name);
  };
  const saveEditGroup = () => {
    if (!editingGroupId || !editGroupName.trim()) return;
    updateGroup(editingGroupId, editGroupName.trim());
    setEditingGroupId(null);
    showToast("✅ 小组已更新");
  };
  const handleDeleteGroup = (id: string, name: string) => {
    const memberCount = data.students.filter((s) => s.groupId === id).length;
    if (memberCount > 0) {
      return showToast(`小组「${name}」下还有 ${memberCount} 名学生，请先移走`);
    }
    if (!window.confirm(`确定删除小组「${name}」？`)) return;
    deleteGroup(id);
    showToast("已删除小组");
  };

  const handleAddRule = () => {
    if (!ruleName.trim()) return showToast("请输入规则名");
    const delta = Number(ruleScore.trim());
    if (!Number.isFinite(delta) || delta === 0) return showToast("分值必须是非0数字");
    addRule(ruleName.trim(), delta);
    setRuleName("");
    setRuleScore("");
    showToast("✅ 已添加规则");
  };

  const startEditRule = (id: string) => {
    const r = data.rules.find((x) => x.id === id);
    if (!r) return;
    setEditingRuleId(id);
    setEditRuleName(r.name);
    setEditRuleScore(String(r.scoreDelta));
  };
  const saveEditRule = () => {
    if (!editingRuleId || !editRuleName.trim()) return;
    const delta = Number(editRuleScore.trim());
    if (!Number.isFinite(delta) || delta === 0) return showToast("分值必须是非0数字");
    updateRule(editingRuleId, editRuleName.trim(), delta);
    setEditingRuleId(null);
    showToast("✅ 规则已更新");
  };
  const handleDeleteRule = (id: string, name: string) => {
    if (!window.confirm(`确定删除规则「${name}」？已有的积分记录不受影响。`)) return;
    deleteRule(id);
    showToast("已删除规则");
  };

  const handleSavePin = () => {
    const ok = updatePin(newPin.trim());
    ok ? (setNewPin(""), showToast("🔒 PIN 已更新")) : showToast("PIN 需为4-6位数字");
  };

  const handleReset = () => {
    if (window.confirm("确定要重置为示例数据？所有当前数据将丢失！")) {
      resetToSeed();
      showToast("🔄 示例数据已重置");
    }
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `积分榜备份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📥 数据已导出");
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const ok = importData(reader.result as string);
        showToast(ok ? "📤 数据已导入" : "导入失败，格式不正确");
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="manage-page">
      <Card>
        <h2>⚙️ 管理模式</h2>
        <p className="muted">管理页受 PIN 保护。在此管理学生、小组、规则和系统设置。</p>
      </Card>

      {/* ═══ 积分日志 ═══ */}
      <Card className="mt-12">
        <div className="audit-header">
          <h3>📜 积分日志</h3>
          <div className="audit-stats">
            <span className="audit-stat">总计 <strong>{logStats.total}</strong></span>
            <span className="audit-stat good">有效 <strong>{logStats.valid}</strong></span>
            <span className="audit-stat bad">已撤回 <strong>{logStats.revoked}</strong></span>
          </div>
        </div>

        <div className="audit-filters">
          <select value={logFilter} onChange={(e) => { setLogFilter(e.target.value as LogFilter); setLogPage(0); }}>
            <option value="all">全部记录</option>
            <option value="valid">仅有效</option>
            <option value="revoked">仅已撤回</option>
          </select>
          <select value={logGroupFilter} onChange={(e) => { setLogGroupFilter(e.target.value); setLogStudentFilter("all"); setLogPage(0); }}>
            <option value="all">全部小组</option>
            {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={logStudentFilter} onChange={(e) => { setLogStudentFilter(e.target.value); setLogPage(0); }}>
            <option value="all">全部学生</option>
            {data.students
              .filter((s) => logGroupFilter === "all" || s.groupId === logGroupFilter)
              .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="audit-count">共 {filteredLogs.length} 条</span>
        </div>

        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>时间</th><th>学生</th><th>小组</th><th>规则</th><th>分值</th><th>状态</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.length > 0 ? pagedLogs.map((r) => {
                const student = findById(data.students, r.studentId);
                const group = findById(data.groups, r.groupId);
                const rule = findById(data.rules, r.ruleId);
                return (
                  <tr key={r.id} className={r.revoked ? "audit-row--revoked" : ""}>
                    <td className="audit-time">
                      <div>{fmtTime(r.createdAt)}</div>
                      {r.revoked && r.revokedAt && <div className="audit-revoked-time">撤回于 {fmtTime(r.revokedAt)}</div>}
                    </td>
                    <td>{student?.name || "-"}</td>
                    <td>{group?.name || "-"}</td>
                    <td>{rule?.name || "-"}</td>
                    <td className={r.scoreDelta >= 0 ? "good" : "bad"}>
                      <strong>{r.scoreDelta > 0 ? "+" : ""}{r.scoreDelta} 分</strong>
                    </td>
                    <td>
                      {r.revoked
                        ? <span className="audit-badge audit-badge--revoked">已撤回</span>
                        : <span className="audit-badge audit-badge--valid">有效</span>}
                    </td>
                    <td>
                      {r.revoked
                        ? <button className="btn-primary btn-sm" onClick={() => handleRestoreRecord(r.id)}>恢复</button>
                        : <button className="btn-danger btn-sm" onClick={() => handleRevokeRecord(r.id)}>撤回</button>}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 24 }}>暂无匹配记录</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="audit-pagination">
            <button className="btn-muted btn-sm" disabled={logPage === 0} onClick={() => setLogPage((p) => p - 1)}>上一页</button>
            <span className="audit-page-info">{logPage + 1} / {totalPages}</span>
            <button className="btn-muted btn-sm" disabled={logPage >= totalPages - 1} onClick={() => setLogPage((p) => p + 1)}>下一页</button>
          </div>
        )}
      </Card>

      <div className="panel-grid split" style={{ marginTop: 12 }}>
        {/* ═══ 学生管理 ═══ */}
        <Card>
          <h3>👤 学生管理</h3>
          <div className="actions">
            <input placeholder="姓名" value={studentName} onChange={(e) => setStudentName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddStudent()} />
            <select value={studentGroup} onChange={(e) => setStudentGroup(e.target.value)}>
              {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button className="btn-primary" onClick={handleAddStudent}>➕ 添加</button>
          </div>
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr><th>姓名</th><th>小组</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              {sortedStudents.map((s) => {
                const group = findById(data.groups, s.groupId);
                const isEditing = editingStudentId === s.id;
                return (
                  <tr key={s.id} className={s.active ? "" : "row-disabled"}>
                    <td>
                      {isEditing
                        ? <input className="edit-inline" value={editStudentName} onChange={(e) => setEditStudentName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditStudent()} />
                        : s.name}
                    </td>
                    <td>
                      {isEditing
                        ? <select className="edit-inline" value={editStudentGroup} onChange={(e) => setEditStudentGroup(e.target.value)}>
                            {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        : group?.name || "-"}
                    </td>
                    <td>{s.active ? "✅ 启用" : "⏸️ 停用"}</td>
                    <td className="manage-actions-cell">
                      {isEditing ? (
                        <>
                          <button className="btn-primary btn-sm" onClick={saveEditStudent}>保存</button>
                          <button className="btn-muted btn-sm" onClick={() => setEditingStudentId(null)}>取消</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-muted btn-sm" onClick={() => startEditStudent(s.id)}>编辑</button>
                          <button className={s.active ? "btn-muted btn-sm" : "btn-primary btn-sm"} onClick={() => { toggleStudent(s.id); showToast("学生状态已更新"); }}>
                            {s.active ? "停用" : "启用"}
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => handleDeleteStudent(s.id, s.name)}>删除</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* ═══ 小组管理 ═══ */}
        <Card>
          <h3>👥 小组管理</h3>
          <div className="actions">
            <input placeholder="小组名" value={groupName} onChange={(e) => setGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddGroup()} />
            <button className="btn-primary" onClick={handleAddGroup}>➕ 添加小组</button>
          </div>
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr><th>小组</th><th>人数</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              {data.groups.map((g) => {
                const memberCount = data.students.filter((s) => s.groupId === g.id).length;
                const isEditing = editingGroupId === g.id;
                return (
                  <tr key={g.id} className={g.active ? "" : "row-disabled"}>
                    <td>
                      {isEditing
                        ? <input className="edit-inline" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditGroup()} />
                        : g.name}
                    </td>
                    <td>{memberCount} 人</td>
                    <td>{g.active ? "✅ 启用" : "⏸️ 停用"}</td>
                    <td className="manage-actions-cell">
                      {isEditing ? (
                        <>
                          <button className="btn-primary btn-sm" onClick={saveEditGroup}>保存</button>
                          <button className="btn-muted btn-sm" onClick={() => setEditingGroupId(null)}>取消</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-muted btn-sm" onClick={() => startEditGroup(g.id)}>编辑</button>
                          <button className={g.active ? "btn-muted btn-sm" : "btn-primary btn-sm"} onClick={() => { toggleGroup(g.id); showToast("小组状态已更新"); }}>
                            {g.active ? "停用" : "启用"}
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => handleDeleteGroup(g.id, g.name)}>删除</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="panel-grid split" style={{ marginTop: 12 }}>
        {/* ═══ 规则管理 ═══ */}
        <Card>
          <h3>📋 规则管理</h3>
          <div className="actions">
            <input placeholder="规则名" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
            <input placeholder="分值(如 2 或 -1)" value={ruleScore} onChange={(e) => setRuleScore(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddRule()} />
            <button className="btn-primary" onClick={handleAddRule}>➕ 添加规则</button>
          </div>
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr><th>规则</th><th>分值</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              {data.rules.map((r) => {
                const isEditing = editingRuleId === r.id;
                return (
                  <tr key={r.id} className={r.enabled ? "" : "row-disabled"}>
                    <td>
                      {isEditing
                        ? <input className="edit-inline" value={editRuleName} onChange={(e) => setEditRuleName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditRule()} />
                        : r.name}
                    </td>
                    <td className={r.scoreDelta >= 0 ? "good" : "bad"}>
                      {isEditing
                        ? <input className="edit-inline edit-inline--short" value={editRuleScore} onChange={(e) => setEditRuleScore(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditRule()} />
                        : <strong>{r.scoreDelta > 0 ? "+" : ""}{r.scoreDelta} 分</strong>}
                    </td>
                    <td>{r.enabled ? "✅ 启用" : "⏸️ 停用"}</td>
                    <td className="manage-actions-cell">
                      {isEditing ? (
                        <>
                          <button className="btn-primary btn-sm" onClick={saveEditRule}>保存</button>
                          <button className="btn-muted btn-sm" onClick={() => setEditingRuleId(null)}>取消</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-muted btn-sm" onClick={() => startEditRule(r.id)}>编辑</button>
                          <button className={r.enabled ? "btn-muted btn-sm" : "btn-primary btn-sm"} onClick={() => { toggleRule(r.id); showToast("规则状态已更新"); }}>
                            {r.enabled ? "停用" : "启用"}
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => handleDeleteRule(r.id, r.name)}>删除</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* ═══ 系统设置 ═══ */}
        <Card>
          <h3>🔧 系统设置</h3>
          <div className="settings-section">
            <h4>🔒 修改 PIN</h4>
            <div className="actions">
              <input placeholder="新PIN（4-6位）" value={newPin} onChange={(e) => setNewPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSavePin()} />
              <button className="btn-primary btn-sm" onClick={handleSavePin}>修改</button>
            </div>
          </div>

          <div className="settings-section">
            <h4>💾 数据管理</h4>
            <div className="actions">
              <button className="btn-primary btn-sm" onClick={handleExportJSON}>📥 导出 JSON</button>
              <button className="btn-muted btn-sm" onClick={handleImportJSON}>📤 导入 JSON</button>
              <button className="btn-danger btn-sm" onClick={handleReset}>🔄 重置示例数据</button>
            </div>
          </div>

          <div className="settings-info">
            <p className="muted">📝 当前记录数：{data.records.length}</p>
            <p className="muted">🔒 当前 PIN：已设置</p>
            <p className="muted">💾 存储方式：SQLite 数据库</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
