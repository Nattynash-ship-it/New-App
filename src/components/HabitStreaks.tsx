"use client";

import { useState } from "react";
import { Card, InlineAdd, SectionTitle } from "./ui";
import { addDays, todayISO } from "@/core/dates";
import { habitBestStreak, habitDoneToday, habitStreak } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

/** GitHub-style 28-day heatmap + streak stats for one habit. */
function HabitStats({ habitId }: { habitId: string }) {
  const habit = useHub((s) => s.habits.find((h) => h.id === habitId));
  if (!habit) return null;

  const done = new Set(habit.history);
  const today = todayISO();
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  const weekStart = addDays(today, -6);
  const thisWeek = habit.history.filter((d) => d >= weekStart && d <= today).length;

  return (
    <div className="animate-slide-in mt-3 rounded-xl border border-line bg-paper p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <span aria-hidden>{habit.icon}</span>
        {habit.name} — last 4 weeks
      </p>
      <div className="grid grid-cols-7 gap-1" role="img" aria-label={`${habit.name} check-ins, last 28 days`}>
        {days.map((d) => (
          <span
            key={d}
            title={d}
            className={`h-4 rounded ${done.has(d) ? "bg-accent" : "bg-ink/[0.07]"} ${d === today ? "ring-1 ring-accent" : ""}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span>
          <span className="font-semibold text-ink">{habitStreak(habit.history)}</span> current streak
        </span>
        <span>
          <span className="font-semibold text-ink">{habitBestStreak(habit.history)}</span> best streak
        </span>
        <span>
          <span className="font-semibold text-ink">{thisWeek}/7</span> this week
        </span>
      </div>
    </div>
  );
}

/**
 * Habit streak ring row — one-tap check-ins with a live day count, the pattern
 * that keeps habit apps sticky. `manage` adds an inline add/remove affordance
 * for the full Wellness view; the compact form is a glanceable dashboard card.
 */
export function HabitStreaks({ manage = false }: { manage?: boolean }) {
  const habits = useHub((s) => s.habits);
  const toggleHabitToday = useHub((s) => s.toggleHabitToday);
  const addHabit = useHub((s) => s.addHabit);
  const removeHabit = useHub((s) => s.removeHabit);
  const [statsFor, setStatsFor] = useState<string | null>(null);

  return (
    <Card>
      <SectionTitle
        right={
          <span className="text-xs text-muted">{manage ? "tap a name for stats" : "tap to check in"}</span>
        }
      >
        Habit streaks
      </SectionTitle>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {habits.map((h) => {
          const done = habitDoneToday(h.history);
          const streak = habitStreak(h.history);
          return (
            <div key={h.id} className="group relative flex flex-col items-center gap-1 text-center">
              <button
                onClick={() => toggleHabitToday(h.id)}
                aria-pressed={done}
                aria-label={`${h.name}: ${streak} day streak, ${done ? "done" : "not done"} today`}
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl transition-all active:scale-90 ${
                  done
                    ? "border-accent bg-accent-soft shadow-[0_0_0_4px_rgb(var(--accent)/0.12)]"
                    : "border-line hover:border-accent"
                }`}
              >
                <span className={done ? "animate-pop" : "opacity-60"}>{h.icon}</span>
              </button>
              {manage ? (
                <button
                  onClick={() => setStatsFor(statsFor === h.id ? null : h.id)}
                  aria-expanded={statsFor === h.id}
                  className={`text-[11px] font-medium leading-tight underline-offset-2 hover:underline ${
                    statsFor === h.id ? "text-accent underline" : ""
                  }`}
                >
                  {h.name}
                </button>
              ) : (
                <span className="text-[11px] font-medium leading-tight">{h.name}</span>
              )}
              <span className="text-[13px] font-semibold tabular-nums text-accent">
                {streak}
                <span className="ml-0.5 text-[9px] font-normal text-muted">
                  {streak === 1 ? "day" : "days"}
                </span>
              </span>
              {manage ? (
                <button
                  onClick={() => removeHabit(h.id)}
                  aria-label={`Remove ${h.name}`}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-fitness text-[9px] leading-none text-white group-hover:flex"
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {manage && statsFor ? <HabitStats habitId={statsFor} /> : null}
      {manage ? (
        <InlineAdd
          placeholder='Add habit ("🥗 Salad")'
          onAdd={(value) => {
            const trimmed = value.trim();
            // If it starts with an emoji, split it off as the icon.
            const match = trimmed.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
            const icon = match?.[1];
            const label = match?.[2]?.trim();
            if (icon && label) addHabit(label, icon);
            else addHabit(trimmed, "✦");
          }}
        />
      ) : null}
    </Card>
  );
}
