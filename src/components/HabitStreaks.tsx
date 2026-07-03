"use client";

import { Card, InlineAdd, SectionTitle } from "./ui";
import { habitDoneToday, habitStreak } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

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

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">tap to check in</span>}>
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
              <span className="text-[11px] font-medium leading-tight">{h.name}</span>
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
