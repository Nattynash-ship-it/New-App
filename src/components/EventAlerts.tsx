"use client";

import { useEffect } from "react";
import { formatTime, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";

const GRACE_MS = 10 * 60 * 1000; // catch up on events that started ≤10 min ago
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fires a browser reminder as an alert-enabled event starts. While the app is
 * open a timer pings at the exact start minute; if the app is (re)opened just
 * after a start, it catches up within a short grace window. Each event pings at
 * most once per day (tracked in sessionStorage). Local-first: like the rest of
 * Vela, it can only remind you while the app is open — the honest promise.
 */
export function EventAlerts() {
  const events = useHub((s) => s.events);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = todayISO();

    let seen: Set<string>;
    try {
      seen = new Set(JSON.parse(sessionStorage.getItem("vela-event-alerted") ?? "[]") as string[]);
    } catch {
      seen = new Set();
    }
    const markSeen = (key: string) => {
      seen.add(key);
      try {
        sessionStorage.setItem("vela-event-alerted", JSON.stringify([...seen]));
      } catch {
        /* storage blocked — the reminder just may repeat next open */
      }
    };
    const fire = (title: string, time?: string, tag?: string) =>
      new Notification("Starting now", {
        body: time ? `${title} · ${formatTime(time)}` : title,
        tag,
      });

    const timers: number[] = [];
    const now = Date.now();

    for (const ev of events) {
      if (!ev.alert || ev.date !== today || !ev.time) continue;
      const key = `${ev.id}:${today}`;
      if (seen.has(key)) continue;

      const parts = ev.time.split(":");
      const h = Number(parts[0]);
      const m = Number(parts[1] ?? 0);
      if (!Number.isFinite(h)) continue;
      const start = new Date();
      start.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
      const delay = start.getTime() - now;

      if (delay <= 0) {
        if (delay > -GRACE_MS) {
          fire(ev.title, ev.time, `vela-event-${ev.id}`);
          markSeen(key);
        }
      } else if (delay <= DAY_MS) {
        const id = window.setTimeout(() => {
          fire(ev.title, ev.time, `vela-event-${ev.id}`);
          markSeen(key);
        }, delay);
        timers.push(id);
      }
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [events]);

  return null;
}
