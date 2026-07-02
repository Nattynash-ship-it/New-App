"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { addDays, formatShort, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";
import type { MealSlot } from "@/core/types";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];
const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

/** 7-day × 3-slot planning grid. Tap an empty cell to add, hover a meal to remove. */
export function WeekPlanner() {
  const plannedMeals = useHub((s) => s.plannedMeals);
  const planMeal = useHub((s) => s.planMeal);
  const removePlannedMeal = useHub((s) => s.removePlannedMeal);

  const [editing, setEditing] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [draft, setDraft] = useState("");

  const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i));

  function commit() {
    if (editing && draft.trim()) {
      planMeal(editing.date, editing.slot, draft.trim());
    }
    setEditing(null);
    setDraft("");
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">tap a cell to plan</span>}>
        Week planner
      </SectionTitle>
      <div className="-mx-1 overflow-x-auto pb-1">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-20" aria-hidden />
              {days.map((d, i) => (
                <th
                  key={d}
                  className={`rounded-lg px-1 py-1.5 text-center text-[11px] font-semibold ${
                    i === 0 ? "bg-meals-soft text-meals-bright" : "text-muted"
                  }`}
                  scope="col"
                >
                  {i === 0 ? "Today" : formatShort(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot}>
                <th
                  scope="row"
                  className="pr-2 text-right align-top text-[11px] font-medium text-muted"
                >
                  {SLOT_LABEL[slot]}
                </th>
                {days.map((date) => {
                  const meals = plannedMeals.filter((m) => m.date === date && m.slot === slot);
                  const isEditing = editing?.date === date && editing?.slot === slot;
                  return (
                    <td key={date} className="align-top">
                      <div className="min-h-[52px] rounded-xl border border-line bg-paper p-1">
                        {meals.map((m) => (
                          <div
                            key={m.id}
                            className="group relative mb-1 rounded-lg bg-surface px-1.5 py-1 text-[11px] leading-snug shadow-card last:mb-0"
                          >
                            {m.title}
                            <button
                              onClick={() => removePlannedMeal(m.id)}
                              aria-label={`Remove ${m.title}`}
                              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-fitness text-[9px] leading-none text-white group-hover:flex"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commit();
                              if (e.key === "Escape") {
                                setEditing(null);
                                setDraft("");
                              }
                            }}
                            placeholder="Meal…"
                            className="w-full rounded-lg border border-meals bg-surface px-1.5 py-1 text-[11px] outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditing({ date, slot });
                              setDraft("");
                            }}
                            aria-label={`Plan ${slot} for ${formatShort(date)}`}
                            className="w-full rounded-lg py-1 text-center text-[13px] leading-none text-muted/50 hover:bg-meals-soft hover:text-meals-bright"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
