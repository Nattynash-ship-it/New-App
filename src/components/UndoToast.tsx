"use client";

import { useEffect } from "react";
import { useUndo } from "@/core/store/undo";

/** Floating "… — Undo" bar for check-to-vanish actions. Auto-dismisses after a
 *  few seconds; sits above the bottom tab bar. Mounted once in the layout. */
export function UndoToast() {
  const toast = useUndo((s) => s.toast);
  const run = useUndo((s) => s.run);
  const dismiss = useUndo((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[60] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="animate-slide-in pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-4 py-2.5 text-sm text-paper shadow-lift">
        <span className="max-w-[60vw] truncate">{toast.message}</span>
        <button
          onClick={run}
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-accent-ink"
          style={{ backgroundColor: "rgb(var(--accent))" }}
        >
          Undo
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-paper/60 hover:text-paper"
        >
          ×
        </button>
      </div>
    </div>
  );
}
