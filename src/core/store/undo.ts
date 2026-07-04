/**
 * Ephemeral "undo" channel for check-to-vanish actions. Items that scratch off
 * and disappear (done tasks, bought groceries) are easy to trigger by accident,
 * so every vanish pushes a short-lived undo here. This store is deliberately
 * *not* persisted — an undo only makes sense for the last few seconds.
 */
import { create } from "zustand";

interface UndoToast {
  /** Monotonic id so the toast component can reset its dismiss timer. */
  id: number;
  message: string;
  undo: () => void;
}

interface UndoState {
  toast: UndoToast | null;
  /** Record an undoable action and surface the toast. */
  push: (message: string, undo: () => void) => void;
  /** Run the pending undo and clear the toast. */
  run: () => void;
  /** Dismiss without undoing. */
  dismiss: () => void;
}

let seq = 0;

export const useUndo = create<UndoState>((set, get) => ({
  toast: null,
  push: (message, undo) => set({ toast: { id: ++seq, message, undo } }),
  run: () => {
    get().toast?.undo();
    set({ toast: null });
  },
  dismiss: () => set({ toast: null }),
}));
