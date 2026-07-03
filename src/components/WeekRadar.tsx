"use client";

import { Card, DOMAIN_STYLES, EmptyState, SectionTitle } from "./ui";
import { daysUntil, formatFriendly, formatTime } from "@/core/dates";
import { selectUpcoming } from "@/core/selectors";
import { useHub } from "@/core/store/hub";
import type { RadarEntry } from "@/core/types";

const BADGE_STYLE: Record<string, string> = {
  appt: "bg-fitness-soft text-fitness-bright",
  school: "bg-school-soft text-school-bright",
  due: "bg-school-soft text-school-bright",
};

const BADGE_LABEL: Record<string, string> = {
  appt: "✚ appointment",
  school: "school event",
  due: "deadline",
};

/**
 * The "keep me updated" surface: the next 7 days across every life area —
 * kids' activities, doctor visits, deadlines, meetings — grouped by day.
 */
export function WeekRadar() {
  const state = useHub();
  const upcoming = selectUpcoming(state, 7);

  const byDay = new Map<string, RadarEntry[]>();
  for (const e of upcoming) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }

  const apptCount = upcoming.filter((e) => e.badge === "appt").length;

  return (
    <Card>
      <SectionTitle
        right={
          apptCount > 0 ? (
            <span className={`chip ${BADGE_STYLE.appt}`}>
              {apptCount} appointment{apptCount === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      >
        Next 7 days
      </SectionTitle>

      {upcoming.length === 0 ? (
        <EmptyState>A clear week ahead. Anything you add lands here automatically.</EmptyState>
      ) : (
        <div className="space-y-3.5">
          {[...byDay.entries()].map(([date, entries]) => {
            const soon = daysUntil(date) <= 2;
            return (
              <div key={date}>
                <p
                  className={`mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    soon ? "text-accent" : "text-muted"
                  }`}
                >
                  {formatFriendly(date)}
                </p>
                <ul className="space-y-1">
                  {entries.map((e) => {
                    const style = DOMAIN_STYLES[e.domain];
                    return (
                      <li key={e.id} className="flex items-center gap-2.5 rounded-xl bg-paper px-2.5 py-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium leading-snug">
                            {e.title}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {e.subtitle ?? style.label}
                            {e.time ? ` · ${formatTime(e.time)}` : ""}
                          </p>
                          {e.note ? (
                            <p className="mt-0.5 truncate text-[11px] italic text-accent/80">
                              ↳ {e.note}
                            </p>
                          ) : null}
                        </div>
                        {e.badge ? (
                          <span className={`chip shrink-0 !text-[10px] ${BADGE_STYLE[e.badge] ?? ""}`}>
                            {BADGE_LABEL[e.badge] ?? e.badge}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
