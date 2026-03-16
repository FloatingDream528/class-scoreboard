import TabNav from "./TabNav";
import Toast from "../Toast";
import PinModal from "../PinModal";
import ScoreAnimation from "../ScoreAnimation";

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <span className="header-icon">🏆</span>
          <h1>班级积分榜</h1>
          <span className="header-sub">课堂积分系统</span>
        </div>
      </header>
      <TabNav />
      <main className="app-main">{children}</main>
      <Toast />
      <PinModal />
      <ScoreAnimation />
    </div>
  );
}
