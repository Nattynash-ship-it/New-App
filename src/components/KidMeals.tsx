"use client";

import { useState } from "react";
import { Card, EmptyState, SectionTitle } from "./ui";
import { kidWeekCalories } from "@/core/selectors";
import { useHub } from "@/core/store/hub";
import type { MealSlot } from "@/core/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS: Array<{ key: MealSlot; label: string; icon: string }> = [
  { key: "breakfast", label: "Breakfast", icon: "🍳" },
  { key: "lunch", label: "Lunch", icon: "🥪" },
  { key: "dinner", label: "Dinner", icon: "🍝" },
];

function MealCell({ kidId, day, slot }: { kidId: string; day: number; slot: MealSlot }) {
  const meal = useHub((s) =>
    s.kidMeals.find((m) => m.kidId === kidId && m.day === day && m.slot === slot),
  );
  const setKidMeal = useHub((s) => s.setKidMeal);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [cal, setCal] = useState("");

  function open() {
    setTitle(meal?.title ?? "");
    setCal(meal ? String(meal.calories) : "");
    setEditing(true);
  }
  function save() {
    setKidMeal(kidId, day, slot, title, Number(cal) || 0);
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        className="flex flex-1 items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meal"
          className="input min-w-0 flex-1 !py-1 text-xs"
        />
        <input
          value={cal}
          onChange={(e) => setCal(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="cal"
          inputMode="numeric"
          className="input !w-14 !py-1 text-xs"
          aria-label="Calories"
        />
        <button type="submit" className="btn-primary !px-2 !py-1 text-[11px]">
          ✓
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={open}
      className="group flex flex-1 items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-ink/[0.04]"
    >
      {meal ? (
        <>
          <span className="min-w-0 truncate">{meal.title}</span>
          <span className="shrink-0 tabular-nums text-muted">{meal.calories} cal</span>
        </>
      ) : (
        <span className="text-muted/70 group-hover:text-accent">+ add</span>
      )}
    </button>
  );
}

/** Weekly breakfast/lunch/dinner planner with calories, per kid. */
export function KidMeals() {
  const kids = useHub((s) => s.kids);
  const state = useHub();
  const [kidId, setKidId] = useState(kids[0]?.id ?? "");

  const activeKid = kids.find((k) => k.id === kidId) ?? kids[0];

  if (!activeKid) {
    return (
      <Card>
        <SectionTitle>Kids&apos; meals this week</SectionTitle>
        <EmptyState>Add a child in the General Store below to plan their meals.</EmptyState>
      </Card>
    );
  }

  const { perDay, total, avgPlannedDay } = kidWeekCalories(state, activeKid.id);

  return (
    <Card>
      <SectionTitle
        right={
          <span className="text-xs text-muted">
            {total.toLocaleString()} cal/wk · ~{avgPlannedDay}/day
          </span>
        }
      >
        Kids&apos; meals this week
      </SectionTitle>

      {kids.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {kids.map((k) => (
            <button
              key={k.id}
              onClick={() => setKidId(k.id)}
              aria-pressed={k.id === activeKid.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                k.id === activeKid.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-ink/25"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: k.color }} aria-hidden />
              {k.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-1.5">
        {DAY_NAMES.map((dayName, day) => (
          <div key={dayName} className="rounded-xl border border-line p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold">{dayName}</span>
              <span className="text-[11px] tabular-nums text-muted">{perDay[day]} cal</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-3">
              {SLOTS.map((s) => (
                <div key={s.key} className="flex items-center gap-1">
                  <span className="w-4 shrink-0 text-center text-xs" title={s.label} aria-hidden>
                    {s.icon}
                  </span>
                  <MealCell kidId={activeKid.id} day={day} slot={s.key} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
