"use client";

import { useState } from "react";
import { formatTime, todayISO } from "@/core/dates";
import {
  encouragementForToday,
  habitDoneToday,
  selectTimeline,
  waterToday,
} from "@/core/selectors";
import { DOMAIN_STYLES } from "./ui";
import { useHub } from "@/core/store/hub";
import type { CheckInPeriod } from "@/core/types";

/** Time-of-day greeting. `period` drives the check-in slot (morning covers
 *  afternoon); `phase` is the finer label used for the greeting word + orb. */
export function dayGreeting(): {
  word: string;
  phase: "morning" | "afternoon" | "evening";
  period: CheckInPeriod;
} {
  const h = new Date().getHours();
  if (h < 12) return { word: "Good morning", phase: "morning", period: "morning" };
  if (h < 17) return { word: "Good afternoon", phase: "afternoon", period: "morning" };
  return { word: "Good evening", phase: "evening", period: "evening" };
}

export function HomeHero() {
  const state = useHub();
  const name = useHub((s) => s.profile.name);
  const { word, phase } = dayGreeting();

  const timeline = selectTimeline(state, todayISO());
  const nowHM = new Date().toTimeString().slice(0, 5);
  const upNext = timeline.find((e) => (e.time ?? "99:99") >= nowHM) ?? timeline[0];

  const habits = state.habits;
  const habitsDone = habits.filter((h) => habitDoneToday(h.history)).length;
  const water = waterToday(state);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="hero-surface card relative overflow-hidden p-6 sm:p-7">
      {/* Decorative floating orbs — soft, blurred, theme-tinted. */}
      <span
        aria-hidden
        className="animate-float pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-accent/20 blur-3xl"
      />
      <span
        aria-hidden
        className="animate-drift pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-family-bright/20 blur-3xl"
      />

      <div className="relative">
        {/* Eyebrow */}
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            <span className="animate-twinkle text-accent">✦</span>
            Vela
            <span className="text-muted/50">·</span>
            <span className="font-medium normal-case tracking-normal">{dateLabel}</span>
          </p>
          <TimePill phase={phase} />
        </div>

        {/* Greeting */}
        <h1 className="mt-3 font-display text-[2rem] leading-tight tracking-tight sm:text-4xl">
          {word},{" "}
          <span className="hero-name">{name}</span>
        </h1>
        <p className="mt-1.5 max-w-md text-sm text-muted">{encouragementForToday()}</p>

        <RoleChip />

        {/* At-a-glance strip */}
        <div className="mt-5 rounded-2xl border border-line bg-surface/70 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  upNext ? DOMAIN_STYLES[upNext.domain].dot : "bg-accent"
                }`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {upNext ? "Up next" : "Today"}
                </p>
                {upNext ? (
                  <p className="truncate text-sm font-medium">
                    {upNext.time ? (
                      <span className="tabular-nums text-accent">{formatTime(upNext.time)} </span>
                    ) : null}
                    {upNext.title}
                  </p>
                ) : (
                  <p className="text-sm font-medium">A clear, open day ✦</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Stat value={`${timeline.length}`} label={timeline.length === 1 ? "thing today" : "things today"} />
              <Stat value={`${habitsDone}/${habits.length}`} label="habits" />
              <Stat value={`${water}`} label="glasses" suffix="💧" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  suffix,
}: {
  value: string;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl bg-paper/80 px-3 py-1.5 text-center">
      <p className="text-sm font-semibold tabular-nums leading-none">
        {value}
        {suffix ? <span className="ml-0.5 text-xs">{suffix}</span> : null}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function TimePill({ phase }: { phase: "morning" | "afternoon" | "evening" }) {
  const meta = {
    morning: { icon: "☀", label: "Morning" },
    afternoon: { icon: "⛅", label: "Afternoon" },
    evening: { icon: "☾", label: "Evening" },
  }[phase];
  return (
    <span className="chip shrink-0 border border-line bg-surface/70 text-muted backdrop-blur-sm">
      <span className="text-accent">{meta.icon}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}

function RoleChip() {
  const roles = useHub((s) => s.profile.roles) ?? [];
  const setRoles = useHub((s) => s.setRoles);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(roles.join(", "));

  if (editing) {
    return (
      <form
        className="mt-3 inline-flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setRoles(draft.split(",").map((r) => r.trim()).filter(Boolean));
          setEditing(false);
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mom, Student, Professional"
          className="input !w-64 !py-1 text-xs"
        />
        <button type="submit" className="btn-ghost !px-2.5 !py-1 text-xs">
          Save
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(roles.join(", "));
        setEditing(true);
      }}
      className="group mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur-sm transition-colors hover:border-accent"
    >
      <span className="text-accent">◔</span>
      {roles.length ? roles.join(" · ") : "Add your roles"}
      <span className="opacity-0 transition-opacity group-hover:opacity-60">✎</span>
    </button>
  );
}
