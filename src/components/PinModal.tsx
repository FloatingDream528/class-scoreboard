import { useState, useRef, useEffect } from "react";
import { useUIStore } from "../store/useUIStore";
import { useAppStore } from "../store/useAppStore";

export default function PinModal() {
  const open = useUIStore((s) => s.pinModalOpen);
  const closePinModal = useUIStore((s) => s.closePinModal);
  const unlockManage = useUIStore((s) => s.unlockManage);
  const showToast = useUIStore((s) => s.showToast);
  const managePin = useAppStore((s) => s.data.settings.managePin);

  const [pin, setPin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const verify = () => {
    if (pin === managePin) {
      unlockManage();
      showToast("管理模式已解锁");
    } else {
      showToast("PIN 错误");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") verify();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={closePinModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>请输入管理 PIN</h3>
        <input
          ref={inputRef}
          type="password"
          maxLength={6}
          placeholder="4-6位数字"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pin-input"
        />
        <div className="modal-actions">
          <button className="btn-muted" onClick={closePinModal}>
            取消
          </button>
          <button className="btn-primary" onClick={verify}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
