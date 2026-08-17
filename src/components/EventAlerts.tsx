"use client";

import { useEffect, useState } from "react";
import { formatTime, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";
import { notifyPermission, showNotification } from "@/lib/notify";

const GRACE_MS = 10 * 60 * 1000; // catch up on events that started ≤10 min ago
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fires a reminder as an alert-enabled event starts. While the app is open a
 * timer pings at the exact start minute; if the app is reopened (or brought
 * back to the foreground) just after a start, it catches up within a short
 * grace window — timers don't survive a backgrounded tab, so that re-check is
 * what makes reminders feel reliable.
 *
 * Notifications go through the service worker (see src/lib/notify.ts) because
 * iPhone/iPad can't show them any other way. Each event pings at most once per
 * day, tracked in sessionStorage.
 */
export function EventAlerts() {
  const events = useHub((s) => s.events);
  // Bumped on focus/visibility so the effect re-runs and catches missed starts.
  const [wake, setWake] = useState(0);

  useEffect(() => {
    const bump = () => {
      if (document.visibilityState === "visible") setWake((n) => n + 1);
    };
    document.addEventListener("visibilitychange", bump);
    window.addEventListener("focus", bump);
    return () => {
      document.removeEventListener("visibilitychange", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  useEffect(() => {
    if (notifyPermission() !== "granted") return;
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
        /* storage blocked — the reminder may just repeat next open */
      }
    };
    const fire = (title: string, time?: string, tag?: string) =>
      void showNotification("Starting now", {
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
  }, [events, wake]);

  return null;
}
