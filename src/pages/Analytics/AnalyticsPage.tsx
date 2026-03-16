import { useState, useMemo } from "react";
import Card from "../../components/Card";
import { useAppStore } from "../../store/useAppStore";
import { useStudentRanking } from "../../hooks/useStudentRanking";
import { useGroupRanking } from "../../hooks/useGroupRanking";
import { useGroupTrend } from "../../hooks/useGroupTrend";
import {
  validRecords,
  filterByDateRange,
  sumBy,
  shortDay,
} from "../../utils/helpers";
import type { TrendDays } from "../../types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#0f766e",
  "#1d4ed8",
  "#dc2626",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function AnalyticsPage() {
  const data = useAppStore((s) => s.data);
  const [trendRange, setTrendRange] = useState<TrendDays>(7);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const trend = useGroupTrend(trendRange);
  const weekStudents = useStudentRanking("week");
  const weekGroups = useGroupRanking("week");

  // 趋势折线图数据
  const trendChartData = trend.labels.map((label, i) => {
    const point: Record<string, string | number> = { date: label };
    trend.rows.forEach((row) => {
      point[row.groupName] = row.values[i];
    });
    return point;
  });

  // 规则使用分布饼图
  const ruleDistribution = useMemo(() => {
    const valid = validRecords(data.records);
    const countMap = new Map<string, number>();
    valid.forEach((r) => {
      countMap.set(r.ruleId, (countMap.get(r.ruleId) || 0) + 1);
    });
    return data.rules.map((rule) => ({
      name: rule.name,
      value: countMap.get(rule.id) || 0,
      positive: rule.scoreDelta > 0,
    }));
  }, [data.records, data.rules]);

  // 学生成长曲线
  const studentGrowthData = useMemo(() => {
    if (!selectedStudentId) return [];
    const valid = validRecords(data.records)
      .filter((r) => r.studentId === selectedStudentId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    const dayMap = new Map<string, number>();
    valid.forEach((r) => {
      const day = shortDay(new Date(r.createdAt));
      dayMap.set(day, (dayMap.get(day) || 0) + r.scoreDelta);
    });

    let cumulative = 0;
    const points: { date: string; score: number; cumulative: number }[] = [];
    dayMap.forEach((score, day) => {
      cumulative += score;
      points.push({ date: day, score, cumulative });
    });

    return points;
  }, [data.records, selectedStudentId]);

  // 小组对比柱状图
  const groupCompareData = useMemo(() => {
    return data.groups.map((g) => {
      const valid = validRecords(data.records).filter(
        (r) => r.groupId === g.id
      );
      const weekRecords = filterByDateRange(valid, "week");
      const monthRecords = filterByDateRange(valid, "month");
      return {
        name: g.name,
        "总积分": sumBy(valid, (r) => r.scoreDelta),
        "周积分": sumBy(weekRecords, (r) => r.scoreDelta),
        "月积分": sumBy(monthRecords, (r) => r.scoreDelta),
      };
    });
  }, [data.groups, data.records]);

  // 周报摘要
  const weeklyReport = useMemo(() => {
    const bestStudent = weekStudents[0];
    const bestGroup = weekGroups[0];

    const valid = filterByDateRange(validRecords(data.records), "week");
    const ruleCount = new Map<string, number>();
    valid.forEach((r) => {
      if (r.scoreDelta > 0) {
        ruleCount.set(r.ruleId, (ruleCount.get(r.ruleId) || 0) + 1);
      }
    });
    let topRuleId = "";
    let topRuleCount = 0;
    ruleCount.forEach((count, id) => {
      if (count > topRuleCount) {
        topRuleCount = count;
        topRuleId = id;
      }
    });
    const topRule = data.rules.find((r) => r.id === topRuleId);

    const now = new Date();
    const thisWeekTotal = sumBy(valid, (r) => r.scoreDelta);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
    const lastWeekRecords = validRecords(data.records).filter((r) => {
      const t = new Date(r.createdAt);
      return t >= lastWeekStart && t < lastWeekEnd;
    });
    const lastWeekTotal = sumBy(lastWeekRecords, (r) => r.scoreDelta);
    const diff = thisWeekTotal - lastWeekTotal;

    return {
      bestStudent,
      bestGroup,
      topRule: topRule ? `${topRule.name} (${topRuleCount}次)` : "-",
      thisWeekTotal,
      lastWeekTotal,
      diff,
    };
  }, [weekStudents, weekGroups, data.records, data.rules]);

  // Excel 导出
  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const studentRows = data.students.map((s) => {
      const group = data.groups.find((g) => g.id === s.groupId);
      const score = sumBy(
        validRecords(data.records).filter((r) => r.studentId === s.id),
        (r) => r.scoreDelta
      );
      return { 姓名: s.name, 小组: group?.name || "-", 状态: s.active ? "启用" : "停用", "积分": score };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentRows), "学生明细");

    const groupRows = data.groups.map((g) => {
      const members = data.students.filter((s) => s.active && s.groupId === g.id).length;
      const score = sumBy(
        validRecords(data.records).filter((r) => r.groupId === g.id),
        (r) => r.scoreDelta
      );
      return { 小组: g.name, 人数: members, "总积分": score, "人均积分": members ? (score / members).toFixed(2) : "0" };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupRows), "小组汇总");

    const ruleRows = data.rules.map((r) => {
      const count = validRecords(data.records).filter((rec) => rec.ruleId === r.id).length;
      return { 规则: r.name, "分值": r.scoreDelta, 使用次数: count, 状态: r.enabled ? "启用" : "停用" };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ruleRows), "规则统计");

    XLSX.writeFile(wb, `积分榜报表-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="analytics-page">
      <Card>
        <div className="analytics-header">
          <h2>📈 积分数据分析</h2>
          <button className="btn-primary" onClick={handleExportExcel}>
            📥 导出 Excel
          </button>
        </div>
      </Card>

      {/* 周报摘要 */}
      <div className="panel-grid stats" style={{ marginTop: 12 }}>
        <article className="card stat-card">
          <div className="stat-icon">🏆</div>
          <h3>本周积分王</h3>
          <div className="metric good">
            {weeklyReport.bestStudent
              ? `${weeklyReport.bestStudent.studentName} (${weeklyReport.bestStudent.score}分)`
              : "-"}
          </div>
        </article>
        <article className="card stat-card">
          <div className="stat-icon">🏅</div>
          <h3>本周最佳小组</h3>
          <div className="metric good">
            {weeklyReport.bestGroup
              ? `${weeklyReport.bestGroup.groupName} (${weeklyReport.bestGroup.score}分)`
              : "-"}
          </div>
        </article>
        <article className="card stat-card">
          <div className="stat-icon">🔥</div>
          <h3>最热门规则</h3>
          <div className="metric">{weeklyReport.topRule}</div>
        </article>
        <article className="card stat-card">
          <div className="stat-icon">{weeklyReport.diff >= 0 ? "📈" : "📉"}</div>
          <h3>较上周</h3>
          <div className={`metric ${weeklyReport.diff >= 0 ? "good" : "bad"}`}>
            {weeklyReport.diff > 0 ? "+" : ""}{weeklyReport.diff} 分
          </div>
        </article>
      </div>

      {/* 趋势折线图 */}
      <Card className="mt-12">
        <div className="select-line">
          <h2 style={{ margin: 0 }}>📊 小组积分趋势</h2>
          <select
            value={trendRange}
            onChange={(e) => setTrendRange(Number(e.target.value) as TrendDays)}
          >
            <option value={7}>近7天</option>
            <option value={14}>近14天</option>
            <option value={30}>近30天</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendChartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {trend.rows.map((row, i) => (
              <Line
                key={row.groupName}
                type="monotone"
                dataKey={row.groupName}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="panel-grid split" style={{ marginTop: 12 }}>
        {/* 规则分布饼图 */}
        <Card title="🥧 规则使用分布">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={ruleDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {ruleDistribution.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={entry.positive ? COLORS[i % COLORS.length] : "#ef4444"}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 小组对比柱状图 */}
        <Card title="📊 小组积分对比">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={groupCompareData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="总积分" fill="#0f766e" />
              <Bar dataKey="周积分" fill="#1d4ed8" />
              <Bar dataKey="月积分" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 学生成长曲线 */}
      <Card title="🌱 学生积分成长曲线" className="mt-12">
        <div className="select-line" style={{ marginBottom: 12 }}>
          <span>选择学生：</span>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">请选择...</option>
            {data.students
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        {selectedStudentId && studentGrowthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={studentGrowthData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="累计积分"
                stroke="#0f766e"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="score"
                name="当日积分"
                stroke="#1d4ed8"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">
            {selectedStudentId ? "该学生暂无积分记录" : "请先选择一名学生"}
          </p>
        )}
      </Card>
    </div>
  );
}
