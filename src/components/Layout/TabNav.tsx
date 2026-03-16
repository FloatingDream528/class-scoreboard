import { useUIStore } from "../../store/useUIStore";
import type { ViewName } from "../../types";

const tabs: { key: ViewName; label: string; icon: string }[] = [
  { key: "board", icon: "📊", label: "主页" },
  { key: "score", icon: "✏️", label: "记分" },
  { key: "public", icon: "📺", label: "公示" },
  { key: "analytics", icon: "📈", label: "分析" },
  { key: "manage", icon: "⚙️", label: "管理" },
];

export default function TabNav() {
  const currentView = useUIStore((s) => s.currentView);
  const setView = useUIStore((s) => s.setView);
  const manageUnlocked = useUIStore((s) => s.manageUnlocked);
  const openPinModal = useUIStore((s) => s.openPinModal);

  const handleClick = (key: ViewName) => {
    if (key === "manage" && !manageUnlocked) {
      openPinModal();
      return;
    }
    setView(key);
  };

  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab-btn ${currentView === tab.key ? "active" : ""}`}
          onClick={() => handleClick(tab.key)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
