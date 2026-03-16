import { useEffect, useCallback, useRef } from "react";
import AppShell from "./components/Layout/AppShell";
import BoardPage from "./pages/Board/BoardPage";
import ScorePage from "./pages/Score/ScorePage";
import PublicPage from "./pages/Public/PublicPage";
import AnalyticsPage from "./pages/Analytics/AnalyticsPage";
import ManagePage from "./pages/Manage/ManagePage";
import { useUIStore } from "./store/useUIStore";
import { useAppStore } from "./store/useAppStore";

const IDLE_TIMEOUT = 60_000; // 1分钟无操作

export default function App() {
  const currentView = useUIStore((s) => s.currentView);
  const loading = useAppStore((s) => s.loading);
  const fetchAllData = useAppStore((s) => s.fetchAllData);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── 1分钟无操作自动切到公示页 ──
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetIdleTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      useUIStore.getState().setView("public");
    }, IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    const handler = () => resetIdleTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer(); // 启动初始计时

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [resetIdleTimer]);

  const renderView = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ fontSize: "1.2rem", color: "#888" }}>⏳ 加载数据中...</p>
        </div>
      );
    }

    switch (currentView) {
      case "board":
        return <BoardPage />;
      case "score":
        return <ScorePage />;
      case "public":
        return <PublicPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "manage":
        return <ManagePage />;
      default:
        return <PublicPage />;
    }
  };

  return <AppShell>{renderView()}</AppShell>;
}
