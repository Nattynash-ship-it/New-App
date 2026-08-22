"use client";

import { useEffect, useMemo } from "react";
import { todayISO } from "@/core/dates";
import { selectAgenda } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

/**
 * Once a day, when you open Vela, a single summary reminder: what's overdue and
 * due today across everything. Fires only if you've allowed notifications (see
 * Connections) and only once per calendar day (tracked in localStorage). This is
 * the "remind me" backstop for a local-first app — the calendar sync handles
 * reminders while the app is closed.
 */
export function DailyDigest() {
  const state = useHub();
  const agenda = useMemo(() => selectAgenda(state), [state]);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = todayISO();
    let last: string | null = null;
    try {
      last = localStorage.getItem("vela-digest-day");
    } catch {
      /* storage blocked */
    }
    if (last === today) return;
    if (agenda.dueNow === 0) return; // nothing to nudge about

    const parts = [
      agenda.overdue ? `${agenda.overdue} overdue` : "",
      agenda.today ? `${agenda.today} due today` : "",
    ].filter(Boolean);

    new Notification("Your day on Vela", {
      body: `${parts.join(" · ")}. Tap to see everything.`,
      tag: `vela-digest-${today}`,
    });

    try {
      localStorage.setItem("vela-digest-day", today);
    } catch {
      /* storage blocked — may repeat next open */
    }
  }, [agenda.dueNow, agenda.overdue, agenda.today]);

  return null;
}
