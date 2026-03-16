import { useEffect } from "react";
import AppShell from "./components/Layout/AppShell";
import BoardPage from "./pages/Board/BoardPage";
import ScorePage from "./pages/Score/ScorePage";
import PublicPage from "./pages/Public/PublicPage";
import AnalyticsPage from "./pages/Analytics/AnalyticsPage";
import ManagePage from "./pages/Manage/ManagePage";
import { useUIStore } from "./store/useUIStore";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const currentView = useUIStore((s) => s.currentView);
  const loading = useAppStore((s) => s.loading);
  const fetchAllData = useAppStore((s) => s.fetchAllData);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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
        return <BoardPage />;
    }
  };

  return <AppShell>{renderView()}</AppShell>;
}
