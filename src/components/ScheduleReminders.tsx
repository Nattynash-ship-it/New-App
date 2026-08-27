"use client";

import { useEffect } from "react";
import { useHub } from "@/core/store/hub";
import { toMinutes } from "@/core/data/weeklySchedule";
import { formatTime, todayISO } from "@/core/dates";

/**
 * Fires a browser reminder when a schedule block with reminders on reaches its
 * start time — the 5 AM movement, 7 PM reading, daily tidy, or anything else you
 * flag. It polls each half-minute while Vela is open and each block pings at most
 * once a day. As with all of Vela's alerts this only works while the app is open;
 * the calendar export from "My Week" carries the same reminders for when it isn't.
 */
export function ScheduleReminders() {
  const weekBlocks = useHub((s) => s.weekBlocks);

  useEffect(() => {
    if (typeof Notification === "undefined") return;

    let fired: Set<string>;
    try {
      fired = new Set(JSON.parse(localStorage.getItem("vela-block-alerts") ?? "[]") as string[]);
    } catch {
      fired = new Set();
    }

    function check() {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const day = now.getDay();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const today = todayISO();

      // Keep only today's fired markers, so each block can ping again tomorrow.
      for (const k of [...fired]) if (!k.endsWith(today)) fired.delete(k);

      let changed = false;
      for (const b of weekBlocks) {
        if (!b.reminder || b.day !== day) continue;
        const start = toMinutes(b.start);
        if (nowMin < start || nowMin > start + 2) continue; // fire in the block's first ~2 min
        const key = `${b.id}:${today}`;
        if (fired.has(key)) continue;
        fired.add(key);
        changed = true;
        new Notification(`⏰ ${b.title}`, { body: `Starting now · ${formatTime(b.start)}`, tag: key });
      }
      if (changed) {
        try {
          localStorage.setItem("vela-block-alerts", JSON.stringify([...fired]));
        } catch {
          /* storage blocked — may repeat */
        }
      }
    }

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [weekBlocks]);

  return null;
}
