"use client";

import Link from "next/link";
import { Card, SectionTitle } from "./ui";
import { balanceNudge, weeklyBalance, type BalanceArea } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

/** A single labelled progress ring. */
function Ring({ area }: { area: BalanceArea }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - area.score / 100);
  // Warm→cool tint as the score climbs, using theme domain hues.
  const stroke =
    area.score >= 66 ? "rgb(var(--meals-bright))" : area.score >= 33 ? "rgb(var(--accent))" : "rgb(var(--fitness-bright))";

  return (
    <Link
      href={area.href}
      className="group flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-colors hover:bg-ink/[0.03]"
      title={`${area.label}: ${area.detail}`}
    >
      <span className="relative inline-flex h-[58px] w-[58px] items-center justify-center">
        <svg width="58" height="58" viewBox="0 0 58 58" className="-rotate-90">
          <circle cx="29" cy="29" r={r} fill="none" stroke="rgb(var(--ink) / 0.08)" strokeWidth="5" />
          <circle
            cx="29"
            cy="29"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,0.9,0.35,1)" }}
          />
        </svg>
        <span className="absolute text-base" aria-hidden>
          {area.icon}
        </span>
      </span>
      <span className="text-[11px] font-semibold leading-none">{area.label}</span>
      <span className="text-[10px] leading-tight text-muted">{area.detail}</span>
    </Link>
  );
}

/**
 * Weekly Life Balance — a calm scorecard across family, school, work, health,
 * and mind, plus one gentle nudge toward whatever's gone quiet. Reduces the
 * mental load of "am I dropping a ball somewhere?" to a single glance.
 */
export function LifeBalance() {
  const state = useHub();
  const { areas, overall, quietest } = weeklyBalance(state);

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">last 7 days</span>}>
        Weekly life balance
      </SectionTitle>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-start">
          <span className="font-display text-4xl leading-none">{overall}</span>
          <span className="text-xs text-muted">
            balance
            <br className="hidden sm:block" /> score
          </span>
        </div>

        <div className="grid flex-1 grid-cols-5 gap-1">
          {areas.map((a) => (
            <Ring key={a.key} area={a} />
          ))}
        </div>
      </div>

      {overall < 90 ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent">
          <span aria-hidden>{quietest.icon}</span>
          <span>{balanceNudge(quietest)}</span>
        </p>
      ) : (
        <p className="mt-3 rounded-xl bg-meals-soft px-3 py-2 text-xs text-meals-bright">
          ✦ Beautifully balanced week — every part of life is getting some love.
        </p>
      )}
    </Card>
  );
}
