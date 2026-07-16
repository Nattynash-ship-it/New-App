"use client";

import { useEffect } from "react";
import { todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";

/**
 * Fires a browser reminder for tasks marked with an alert once they're due
 * (due today or overdue, not done). Runs when the app opens and whenever tasks
 * change; each task pings at most once per day (tracked in sessionStorage), and
 * only when the user has allowed notifications. No backend — Vela reminds you
 * next time you open it, which for a local-first app is the honest promise.
 */
export function DueTaskAlerts() {
  const todos = useHub((s) => s.todos);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = todayISO();
    let seen: Set<string>;
    try {
      seen = new Set(JSON.parse(sessionStorage.getItem("vela-alerted") ?? "[]") as string[]);
    } catch {
      seen = new Set();
    }

    const due = todos.filter(
      (t) => t.alert && !t.done && t.dueDate && t.dueDate <= today && !seen.has(`${t.id}:${today}`),
    );

    for (const t of due) {
      const overdue = (t.dueDate ?? today) < today;
      new Notification(overdue ? "Task overdue" : "Task due today", {
        body: t.title,
        tag: `vela-task-${t.id}`,
      });
      seen.add(`${t.id}:${today}`);
    }
    if (due.length) {
      try {
        sessionStorage.setItem("vela-alerted", JSON.stringify([...seen]));
      } catch {
        /* storage blocked — reminders just repeat next open */
      }
    }
  }, [todos]);

  return null;
}
