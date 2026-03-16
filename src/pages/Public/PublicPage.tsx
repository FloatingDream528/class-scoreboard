import { useState, useEffect, useMemo, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Card from "../../components/Card";
import { useStudentRanking } from "../../hooks/useStudentRanking";
import { useGroupRanking } from "../../hooks/useGroupRanking";
import { useGroupTrend } from "../../hooks/useGroupTrend";
import { useGroupContributors } from "../../hooks/useGroupContributors";
import { withSign } from "../../utils/helpers";
import type {
  StudentRankRow,
  GroupRankRow,
  GroupContribution,
  GroupTrendRow,
} from "../../types";

/* ─── Constants ─── */
const PANEL_COUNT = 4;
const PANEL_NAMES = ["🏅 个人排行", "👥 小组排行", "📈 积分趋势", "⭐ 今日之星"];
const PANEL_DURATIONS = [12000, 10000, 10000, 10000];
const GROUP_COLORS = [
  "#0f766e", "#1d4ed8", "#dc2626", "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16",
];
const MEDAL_EMOJI = ["🥇", "🥈", "🥉"];

/* ─── Animation Variants ─── */
const panelVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 220, damping: 28 },
      opacity: { duration: 0.35 },
      scale: { duration: 0.35 },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-60%" : "60%",
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.28 },
  }),
};

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const podiumVariants: Variants = {
  hidden: { y: 160, opacity: 0 },
  show: (rank: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 180,
      damping: 20,
      delay: rank === 1 ? 0.35 : rank === 2 ? 0.15 : 0.5,
    },
  }),
};

/* ─── Local Hook: Live Clock ─── */
function useClock(): string {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* ─── Panel 1: Student Ranking with Podium ─── */
function StudentRankPanel({ students }: { students: StudentRankRow[] }) {
  const top3 = useMemo(() => students.slice(0, 3), [students]);
  const rest = useMemo(() => students.slice(3, 10), [students]);

  if (students.length === 0) {
    return (
      <>
        <h2 className="pp-panel-title">🏅 个人排行榜</h2>
        <div className="pp-empty">暂无排名数据</div>
      </>
    );
  }

  const podiumOrder = useMemo(() => {
    if (top3.length < 3) return top3.map((s, i) => ({ student: s, rank: i + 1 }));
    return [
      { student: top3[1], rank: 2 },
      { student: top3[0], rank: 1 },
      { student: top3[2], rank: 3 },
    ];
  }, [top3]);

  const rankClass = (rank: number) =>
    rank === 1 ? "pp-podium-block--gold" : rank === 2 ? "pp-podium-block--silver" : "pp-podium-block--bronze";

  return (
    <>
      <h2 className="pp-panel-title">🏅 个人排行榜（周榜）</h2>
      <motion.div className="pp-podium" variants={staggerContainer} initial="hidden" animate="show">
        {podiumOrder.map(({ student, rank }) => (
          <motion.div
            key={student.studentId}
            className={`pp-podium-block ${rankClass(rank)}`}
            variants={podiumVariants}
            custom={rank}
          >
            <div className="pp-podium-avatar">{student.studentName.slice(0, 1)}</div>
            <div className="pp-podium-name">{student.studentName}</div>
            <div className="pp-podium-group">{student.groupName}</div>
            <div className="pp-podium-score">{student.score} 分</div>
            <div className="pp-podium-base">{MEDAL_EMOJI[rank - 1]}</div>
          </motion.div>
        ))}
      </motion.div>

      {rest.length > 0 && (
        <motion.div className="pp-rank-list" variants={staggerContainer} initial="hidden" animate="show">
          {rest.map((s, i) => (
            <motion.div key={s.studentId} className="pp-rank-row" variants={staggerItem}>
              <span className="pp-rank-badge">{i + 4}</span>
              <span className="pp-rank-row-name">{s.studentName}</span>
              <span className="pp-rank-row-group">{s.groupName}</span>
              <span className="pp-rank-row-score">{s.score} 分</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}

/* ─── Panel 2: Group Ranking with Bars ─── */
function GroupRankPanel({ groups }: { groups: GroupRankRow[] }) {
  const maxScore = useMemo(() => Math.max(1, ...groups.map((g) => Math.abs(g.score))), [groups]);

  if (groups.length === 0) {
    return (
      <>
        <h2 className="pp-panel-title">👥 小组排行榜</h2>
        <div className="pp-empty">暂无小组数据</div>
      </>
    );
  }

  return (
    <>
      <h2 className="pp-panel-title">👥 小组排行榜（周榜）</h2>
      <motion.div className="pp-group-bars" variants={staggerContainer} initial="hidden" animate="show">
        {groups.map((g, i) => {
          const pct = Math.max(5, (Math.abs(g.score) / maxScore) * 100);
          return (
            <motion.div key={g.groupId} className="pp-bar-row" variants={staggerItem}>
              <span className="pp-bar-rank">{MEDAL_EMOJI[i] || `${i + 1}.`}</span>
              <span className="pp-bar-label">{g.groupName}</span>
              <div className="pp-bar-track">
                <motion.div
                  className="pp-bar-fill"
                  style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: i * 0.15 }}
                />
              </div>
              <span className="pp-bar-value">{g.score} 分</span>
              <span className="pp-bar-meta">{g.members}人 · 人均{g.avg}分</span>
            </motion.div>
          );
        })}
      </motion.div>
    </>
  );
}

/* ─── Panel 3: Trend Chart ─── */
function TrendChartPanel({ trend }: { trend: { labels: string[]; rows: GroupTrendRow[] } }) {
  const chartData = useMemo(() => {
    return trend.labels.map((label, i) => {
      const point: Record<string, string | number> = { date: label };
      trend.rows.forEach((row) => { point[row.groupName] = row.values[i]; });
      return point;
    });
  }, [trend]);

  if (trend.rows.length === 0) {
    return (
      <>
        <h2 className="pp-panel-title">📈 积分趋势</h2>
        <div className="pp-empty">暂无趋势数据</div>
      </>
    );
  }

  return (
    <>
      <h2 className="pp-panel-title">📈 小组近7天积分趋势</h2>
      <div className="pp-chart-wrap">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={13} />
            <YAxis stroke="#94a3b8" fontSize={13} />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            {trend.rows.map((row, i) => (
              <Line
                key={row.groupName}
                type="monotone"
                dataKey={row.groupName}
                stroke={GROUP_COLORS[i % GROUP_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 5, fill: GROUP_COLORS[i % GROUP_COLORS.length] }}
                activeDot={{ r: 8, strokeWidth: 2 }}
                animationDuration={1500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ─── Panel 4: Today's Star + Contributions ─── */
function TodayStarPanel({
  todayStudents,
  contributions,
}: {
  todayStudents: StudentRankRow[];
  contributions: GroupContribution[];
}) {
  const star = todayStudents[0];

  return (
    <>
      <h2 className="pp-panel-title">⭐ 今日之星</h2>
      <div className="pp-today-layout">
        <motion.div
          className="pp-hero-card"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
        >
          {star ? (
            <>
              <div className="pp-hero-crown">👑</div>
              <div className="pp-hero-avatar">{star.studentName.slice(0, 1)}</div>
              <div className="pp-hero-name">{star.studentName}</div>
              <div className="pp-hero-group">{star.groupName}</div>
              <div className="pp-hero-score">{withSign(star.score)} 分</div>
              <div className="pp-hero-label">今日积分王</div>
            </>
          ) : (
            <>
              <div className="pp-hero-crown">⭐</div>
              <div className="pp-hero-label">今日暂无记录</div>
              <div className="pp-hero-sublabel">快去记分吧！</div>
            </>
          )}
        </motion.div>

        <motion.div className="pp-contrib-grid" variants={staggerContainer} initial="hidden" animate="show">
          {contributions.map((c) => (
            <motion.div key={c.groupName} className="pp-contrib-card" variants={staggerItem}>
              <div className="pp-contrib-title">{c.groupName}</div>
              <div className="pp-contrib-row">
                <span className="pp-contrib-icon">⬆️</span>
                <span className="pp-contrib-text pp-contrib-plus">{c.plusText || "暂无"}</span>
              </div>
              <div className="pp-contrib-row">
                <span className="pp-contrib-icon">⬇️</span>
                <span className="pp-contrib-text pp-contrib-minus">{c.minusText || "暂无"}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  );
}

/* ─── Ticker Bar ─── */
function TickerBar({ students }: { students: StudentRankRow[] }) {
  const items = useMemo(() => {
    if (students.length === 0) return ["📊 班级积分榜 — 努力赢取更多积分！"];
    return students.slice(0, 10).map(
      (s, i) => `${MEDAL_EMOJI[i] || `${i + 1}.`} ${s.studentName} ${s.score}分`
    );
  }, [students]);

  const track = [...items, ...items];

  return (
    <div className="pp-ticker">
      <motion.div
        className="pp-ticker-track"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ x: { duration: items.length * 4, repeat: Infinity, ease: "linear" } }}
      >
        {track.map((text, i) => (
          <span key={i} className="pp-ticker-item">{text}</span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Page Indicator ─── */
function PageIndicator({
  count, active, onDotClick,
}: {
  count: number; active: number; onDotClick: (i: number) => void;
}) {
  return (
    <div className="pp-dots">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          className={`pp-dot ${active === i ? "pp-dot--active" : ""}`}
          onClick={() => onDotClick(i)}
          title={PANEL_NAMES[i]}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/* ─── Main Component ─── */
/* ═══════════════════════════════════════════ */
export default function PublicPage() {
  const weekStudents = useStudentRanking("week");
  const todayStudents = useStudentRanking("today");
  const groupRanks = useGroupRanking("week");
  const trend = useGroupTrend(7);
  const contributions = useGroupContributors("week");

  const topStudents = useMemo(() => weekStudents.slice(0, 10), [weekStudents]);
  const todayTop = useMemo(() => todayStudents.slice(0, 10), [todayStudents]);

  const [panelIndex, setPanelIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const ms = PANEL_DURATIONS[panelIndex] ?? 8000;
    const timer = setTimeout(() => {
      setDirection(1);
      setPanelIndex((prev) => (prev + 1) % PANEL_COUNT);
    }, ms);
    return () => clearTimeout(timer);
  }, [panelIndex, autoPlay]);

  const goTo = useCallback(
    (i: number) => {
      setDirection(i > panelIndex ? 1 : -1);
      setPanelIndex(i);
    },
    [panelIndex]
  );

  const clock = useClock();

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const renderPanel = (i: number) => {
    switch (i) {
      case 0: return <StudentRankPanel students={topStudents} />;
      case 1: return <GroupRankPanel groups={groupRanks} />;
      case 2: return <TrendChartPanel trend={trend} />;
      case 3: return <TodayStarPanel todayStudents={todayTop} contributions={contributions} />;
      default: return null;
    }
  };

  return (
    <div className="pp-container">
      {/* Header Bar */}
      <Card className="pp-header-card">
        <div className="pp-header">
          <div className="pp-header-left">
            <span className="pp-header-logo">📺</span>
            <span className="pp-header-title">班级积分公示</span>
            <span className="pp-header-badge">周榜</span>
          </div>
          <div className="pp-header-right">
            <span className="pp-header-clock">{clock}</span>
            <label className="pp-autoplay-toggle">
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
              />
              🔄 轮播
            </label>
            <button className="btn-muted btn-sm" onClick={toggleFullscreen}>
              🖥️ 全屏
            </button>
          </div>
        </div>
      </Card>

      {/* Carousel */}
      <div className="pp-carousel">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={panelIndex}
            custom={direction}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="pp-panel"
          >
            {renderPanel(panelIndex)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="pp-footer">
        <PageIndicator count={PANEL_COUNT} active={panelIndex} onDotClick={goTo} />
        <TickerBar students={topStudents} />
      </div>
    </div>
  );
}
