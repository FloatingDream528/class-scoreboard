import { create } from "zustand";
import type { ViewName } from "../types";

interface UIStore {
  // Navigation
  currentView: ViewName;
  setView: (view: ViewName) => void;

  // PIN
  manageUnlocked: boolean;
  pinModalOpen: boolean;
  openPinModal: () => void;
  closePinModal: () => void;
  unlockManage: () => void;

  // Toast
  toastMessage: string;
  toastVisible: boolean;
  showToast: (msg: string) => void;

  // Score animation
  scoreAnimation: { text: string; positive: boolean } | null;
  showScoreAnimation: (text: string, positive: boolean) => void;
  clearScoreAnimation: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: "board",
  setView: (view) => set({ currentView: view }),

  manageUnlocked: false,
  pinModalOpen: false,
  openPinModal: () => set({ pinModalOpen: true }),
  closePinModal: () => set({ pinModalOpen: false }),
  unlockManage: () =>
    set({ manageUnlocked: true, pinModalOpen: false, currentView: "manage" }),

  toastMessage: "",
  toastVisible: false,
  showToast: (msg) => {
    set({ toastMessage: msg, toastVisible: true });
    setTimeout(() => set({ toastVisible: false }), 1800);
  },

  scoreAnimation: null,
  showScoreAnimation: (text, positive) => {
    set({ scoreAnimation: { text, positive } });
    setTimeout(() => set({ scoreAnimation: null }), 1500);
  },
  clearScoreAnimation: () => set({ scoreAnimation: null }),
}));
