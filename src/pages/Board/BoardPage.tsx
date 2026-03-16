import { useState } from "react";
import StatCard from "../../components/StatCard";
import Card from "../../components/Card";
import { useSummary } from "../../hooks/useSummary";
import { useStudentRanking } from "../../hooks/useStudentRanking";
import { useGroupRanking } from "../../hooks/useGroupRanking";
import { useGroupContributors } from "../../hooks/useGroupContributors";
import { useGroupTrend } from "../../hooks/useGroupTrend";
import { useAppStore } from "../../store/useAppStore";
import { useUIStore } from "../../store/useUIStore";
import { withSign, fmtTime, findById } from "../../utils/helpers";
import { validRecords } from "../../utils/helpers";
import type { DateRange, TrendDays } from "../../types";

/** 排名奖牌 */
function medal(i: number): string {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `${i + 1}.`;
}

export default function BoardPage() {
  const [groupRange, setGroupRange] = useState<DateRange>("all");
  const [trendDays, setTrendDays] = useState<TrendDays>(7);

  const summary = useSummary();
  const topStudents = useStudentRanking("all").slice(0, 10);
  const groupRanks = useGroupRanking(groupRange);
  const contributions = useGroupContributors(groupRange);
  const trend = useGroupTrend(trendDays);

  const records = useAppStore((s) => s.data.records);
  const students = useAppStore((s) => s.data.students);
  const groups = useAppStore((s) => s.data.groups);
  const undoLastRecord = useAppStore((s) => s.undoLastRecord);
  const setView = useUIStore((s) => s.setView);
  const showToast = useUIStore((s) => s.showToast);

  const recentRecords = validRecords(records)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  const handleUndo = () => {
    const ok = undoLastRecord();
    showToast(ok ? "↩️ 已撤销上一条" : "没有5分钟内可撤销的记录");
  };

  return (
    <div className="board-page">
      {/* 统计卡片 */}
      <div className="panel-grid stats">
        <StatCard icon="🏆" label="总积分" value={summary.totalScore} />
        <StatCard
          icon="📅"
          label="今日积分"
          value={`${summary.todayScore >= 0 ? "+" : ""}${summary.todayScore}`}
          colorClass={summary.todayScore >= 0 ? "good" : "bad"}
        />
        <StatCard
          icon="📆"
          label="本周积分"
          value={`${summary.weekScore >= 0 ? "+" : ""}${summary.weekScore}`}
          colorClass={summary.weekScore >= 0 ? "good" : "bad"}
        />
        <StatCard icon="📝" label="记录总数" value={summary.validRecords} />
      </div>

      {/* 快捷操作 */}
      <div className="quick-actions">
        <button className="btn-action btn-go-score" onClick={() => setView("score")}>
          <span className="btn-action-icon">✏️</span>
          <span>去记分</span>
        </button>
        <button className="btn-action btn-undo" onClick={handleUndo}>
          <span className="btn-action-icon">↩️</span>
          <span>撤销上一条</span>
        </button>
        <button className="btn-action btn-go-analytics" onClick={() => setView("analytics")}>
          <span className="btn-action-icon">📈</span>
          <span>查看分析</span>
        </button>
      </div>

      {/* 学生 Top10 + 小组排行 */}
      <div className="panel-grid split">
        <Card title="🏆 积分王 Top10">
          <div className="list">
            {topStudents.length > 0 ? (
              topStudents.map((row, i) => (
                <div className={`row rank-row ${i < 3 ? "top3" : ""}`} key={row.studentId}>
                  <span className="rank-info">
                    <span className="rank-medal">{medal(i)}</span>
                    <span className="rank-name">{row.studentName}</span>
                    <span className="tag">{row.groupName}</span>
                  </span>
                  <strong className={row.score >= 0 ? "good" : "bad"}>
                    {row.score} 分
                  </strong>
                </div>
              ))
            ) : (
              <p className="muted">暂无数据，快去记分吧！</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="select-line">
            <h2 style={{ margin: 0 }}>🏅 小组排行榜</h2>
            <select
              value={groupRange}
              onChange={(e) => setGroupRange(e.target.value as DateRange)}
            >
              <option value="all">总榜</option>
              <option value="week">周榜</option>
              <option value="month">月榜</option>
            </select>
          </div>
          <div className="list">
            {groupRanks.length > 0 ? (
              groupRanks.map((row, i) => (
                <div className={`row rank-row ${i < 3 ? "top3" : ""}`} key={row.groupId}>
                  <span className="rank-info">
                    <span className="rank-medal">{medal(i)}</span>
                    <span className="rank-name">{row.groupName}</span>
                    <span className="tag">
                      {row.members}人 · 人均{row.avg}分
                    </span>
                  </span>
                  <strong className={row.score >= 0 ? "good" : "bad"}>
                    {row.score} 分
                  </strong>
                </div>
              ))
            ) : (
              <p className="muted">暂无小组数据</p>
            )}
          </div>
        </Card>
      </div>

      {/* 小组贡献 + 趋势 */}
      <div className="panel-grid split" style={{ marginTop: 12 }}>
        <Card title="⭐ 小组贡献 Top3">
          {contributions.length > 0 ? (
            contributions.map((item) => (
              <div className="contrib-row" key={item.groupName}>
                <div className="contrib-group">{item.groupName}</div>
                <div className="contrib-detail">
                  <span className="contrib-plus">⬆️ {item.plusText || "暂无"}</span>
                  <span className="contrib-minus">⬇️ {item.minusText || "暂无"}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">暂无贡献数据</p>
          )}
        </Card>

        <Card>
          <div className="select-line">
            <h2 style={{ margin: 0 }}>📊 积分趋势</h2>
            <select
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value) as TrendDays)}
            >
              <option value={7}>近7天</option>
              <option value={14}>近14天</option>
              <option value={30}>近30天</option>
            </select>
          </div>
          {trend.rows.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>小组</th>
                  <th>每日趋势</th>
                  <th>合计</th>
                </tr>
              </thead>
              <tbody>
                {trend.rows.map((r) => (
                  <tr key={r.groupName}>
                    <td><strong>{r.groupName}</strong></td>
                    <td className="trend-values">
                      {r.values.map((v, i) => (
                        <span key={i} className={`trend-cell ${v > 0 ? "good" : v < 0 ? "bad" : ""}`}>
                          {withSign(v)}
                        </span>
                      ))}
                    </td>
                    <td className={r.total >= 0 ? "good" : "bad"}>
                      <strong>{withSign(r.total)} 分</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">暂无趋势数据</p>
          )}
        </Card>
      </div>

      {/* 最新记录 */}
      <Card title="🕐 最新记录" className="mt-12">
        <div className="list">
          {recentRecords.length > 0 ? (
            recentRecords.map((r) => {
              const student = findById(students, r.studentId);
              const group = findById(groups, r.groupId);
              const rules = useAppStore.getState().data.rules;
              const rule = findById(rules, r.ruleId);
              return (
                <div className="row record-row" key={r.id}>
                  <span className="record-info">
                    <span className="record-icon">{r.scoreDelta >= 0 ? "⬆️" : "⬇️"}</span>
                    <span className="record-name">{student?.name || "-"}</span>
                    <span className="tag">{group?.name || "-"}</span>
                    {rule && <span className="tag">{rule.name}</span>}
                  </span>
                  <span className="record-right">
                    <strong className={r.scoreDelta >= 0 ? "good" : "bad"}>
                      {r.scoreDelta > 0 ? "+" : ""}{r.scoreDelta} 分
                    </strong>
                    <span className="record-time">{fmtTime(r.createdAt)}</span>
                  </span>
                </div>
              );
            })
          ) : (
            <p className="muted">暂无记录，快去记分吧！</p>
          )}
        </div>
      </Card>
    </div>
  );
}
