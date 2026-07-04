"use client";

import { useState } from "react";
import { EnergyPlan } from "@/components/EnergyPlan";
import { HabitStreaks } from "@/components/HabitStreaks";
import { HomeHero, dayGreeting } from "@/components/HomeHero";
import { LifeBalance } from "@/components/LifeBalance";
import { MoodTrend } from "@/components/MoodTrend";
import { MotivationBanner } from "@/components/MotivationBanner";
import { OverviewStrip } from "@/components/OverviewStrip";
import { QuickAdd } from "@/components/QuickAdd";
import { SmartCapture } from "@/components/SmartCapture";
import { TimeBlockCalendar } from "@/components/TimeBlockCalendar";
import { TodoList } from "@/components/TodoList";
import { TomorrowHeadsUp } from "@/components/TomorrowHeadsUp";
import { WaterCard } from "@/components/WaterCard";
import { WeekRadar } from "@/components/WeekRadar";
import { Card, DOMAIN_STYLES, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { formatTime, todayISO } from "@/core/dates";
import { selectTimeline } from "@/core/selectors";
import { useHub, useHydrated } from "@/core/store/hub";
import type { Mood } from "@/core/types";

const MOODS: Array<{ value: Mood; face: string; label: string }> = [
  { value: 1, face: "◦", label: "Heavy" },
  { value: 2, face: "◔", label: "Low" },
  { value: 3, face: "◑", label: "Okay" },
  { value: 4, face: "◕", label: "Good" },
  { value: 5, face: "●", label: "Great" },
];

function CheckInCard() {
  const { period, phase } = dayGreeting();
  const checkIns = useHub((s) => s.checkIns);
  const addCheckIn = useHub((s) => s.addCheckIn);
  const existing = checkIns.find((c) => c.date === todayISO() && c.period === period);

  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");

  // Label reflects the real time of day (phase), the check-in slot (period)
  // still groups afternoon with morning.
  const label = phase === "evening" ? "Evening" : phase === "afternoon" ? "Afternoon" : "Morning";
  const promptText =
    period === "morning" ? "One intention for today" : "One good thing about today";

  if (existing) {
    return (
      <Card>
        <SectionTitle>{label} check-in · done</SectionTitle>
        <p className="text-sm text-muted">
          Mood {MOODS.find((m) => m.value === existing.mood)?.label.toLowerCase()}
          {existing.note ? ` — “${existing.note}”` : ""}. See you{" "}
          {period === "morning" ? "tonight" : "tomorrow morning"}.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>
        {label} check-in
        <span className="ml-2 font-normal text-muted">~20 seconds</span>
      </SectionTitle>
      <div className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMood(m.value)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-lg transition-all ${
              mood === m.value
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-muted hover:border-ink/25"
            }`}
            aria-pressed={mood === m.value}
          >
            <span aria-hidden>{m.face}</span>
            <span className="text-[10px] font-medium">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={promptText}
          className="input"
          maxLength={140}
        />
        <button
          className="btn-primary shrink-0"
          disabled={mood === null}
          onClick={() => {
            if (mood !== null) addCheckIn(period, mood, note.trim(), promptText);
          }}
        >
          Save
        </button>
      </div>
    </Card>
  );
}

function Timeline() {
  const state = useHub();
  const removeTimelineItem = useHub((s) => s.removeTimelineItem);
  const entries = selectTimeline(state, todayISO());
  // Assignments and study blocks are managed on their own pages; everything
  // else on the timeline can be removed right here.
  const removable = new Set([
    ...state.meetings.map((m) => m.id),
    ...state.events.map((e) => e.id),
    ...state.plannedMeals.map((m) => m.id),
    ...state.activities.map((a) => a.id),
  ]);

  return (
    <Card>
      <SectionTitle>
        Today, all in one view
        <span className="ml-2 font-normal text-muted">
          {entries.length} item{entries.length === 1 ? "" : "s"}
        </span>
      </SectionTitle>
      {entries.length === 0 ? (
        <EmptyState>A clear day. Add something above, or enjoy the space.</EmptyState>
      ) : (
        <ol className="relative ml-2 space-y-0">
          {entries.map((e, i) => {
            const style = DOMAIN_STYLES[e.domain];
            return (
              <li key={e.id} className="group relative flex gap-4 pb-4 last:pb-0">
                {i < entries.length - 1 ? (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden />
                ) : null}
                <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${style.dot}`} />
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {e.title}
                      {e.badge === "appt" ? (
                        <span className="chip ml-2 bg-fitness-soft !text-[10px] text-fitness-bright">
                          ✚ appointment
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">
                      <span className={style.text}>{style.label}</span>
                      {e.subtitle ? ` · ${e.subtitle}` : ""}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted">
                    {e.time ? formatTime(e.time) : "All day"}
                    {removable.has(e.id) ? (
                      <button
                        onClick={() => removeTimelineItem(e.id)}
                        aria-label={`Remove ${e.title}`}
                        className="rounded-full px-1 opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export default function CompassPage() {
  const hydrated = useHydrated();

  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <HomeHero />

      {/* Whole life at a glance */}
      <OverviewStrip />

      {/* Energy-aware plan — right-size today in one tap */}
      <EnergyPlan />

      <QuickAdd />

      {/* General to-do list with urgency levels */}
      <TodoList />

      {/* One glance: is any part of life being dropped? */}
      <LifeBalance />

      {/* Bulk capture — paste an email, snap a flyer, or dictate */}
      <SmartCapture />

      {/* Wellness at a glance — habits + hydration */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HabitStreaks />
        </div>
        <div className="lg:col-span-2">
          <WaterCard />
        </div>
      </div>

      {/* Time-block calendar — the day laid out on an hour grid */}
      <TimeBlockCalendar />

      {/* Nothing sneaks up overnight */}
      <TomorrowHeadsUp />

      {/* Today + the week ahead, side by side */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Timeline />
          <CheckInCard />
        </div>
        <div className="space-y-5 lg:col-span-2">
          <WeekRadar />
          <MoodTrend />
        </div>
      </div>

      <MotivationBanner />
    </div>
  );
}
