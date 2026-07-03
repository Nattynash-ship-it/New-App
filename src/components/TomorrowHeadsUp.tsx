"use client";

import { DOMAIN_STYLES } from "./ui";
import { formatTime } from "@/core/dates";
import { selectUpcoming } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

/**
 * Slim banner surfacing everything happening tomorrow — with prep notes —
 * so nothing (a doctor visit, a deadline, an early practice) sneaks up
 * overnight. Renders nothing on clear days.
 */
export function TomorrowHeadsUp() {
  const state = useHub();
  const tomorrow = selectUpcoming(state, 1);

  if (tomorrow.length === 0) return null;

  return (
    <div className="card border-accent/25 !bg-accent-soft px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        Heads up — tomorrow
      </p>
      <ul className="mt-1.5 space-y-1">
        {tomorrow.map((e) => {
          const style = DOMAIN_STYLES[e.domain];
          return (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
              <span className={`inline-block h-2 w-2 shrink-0 self-center rounded-full ${style.dot}`} aria-hidden />
              <span className="font-medium">{e.title}</span>
              <span className="text-xs text-muted">
                {e.subtitle}
                {e.time ? ` · ${formatTime(e.time)}` : ""}
              </span>
              {e.note ? (
                <span className="basis-full pl-4 text-xs italic text-accent/90">↳ {e.note}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
