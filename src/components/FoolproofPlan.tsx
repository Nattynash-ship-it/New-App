"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { buildFoolproofPlan } from "@/core/fitness/foolproofPlan";
import { formVideoUrl, LEVEL_META } from "@/core/fitness/library";
import { recipeVideoUrl } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

/**
 * The foolproof plan — this week's workouts (with form videos), goal-aligned
 * meal prep (with how-to videos), and a one-tap grocery list to make it happen.
 */
export function FoolproofPlan() {
  const state = useHub();
  const addGroceryItems = useHub((s) => s.addGroceryItems);
  const plan = buildFoolproofPlan(state);
  const [openWorkout, setOpenWorkout] = useState<string | null>(null);
  const [groceryMsg, setGroceryMsg] = useState<string | null>(null);

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-fitness" aria-hidden />
      <SectionTitle right={<span className="text-xs text-muted">workouts · meals · groceries</span>}>
        Your foolproof plan
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Built for <span className="font-medium text-ink">{plan.goalLabels.join(" · ")}</span> and the
        gear you own — {plan.trainingDays} training days, batch-cook meals, and the grocery list to
        match.
      </p>

      {/* Weekly training schedule */}
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        This week&apos;s training
      </p>
      <div className="grid grid-cols-7 gap-1">
        {plan.schedule.map((d) => (
          <div
            key={d.label}
            className={`rounded-lg px-1 py-1.5 text-center ${
              d.workout ? "bg-fitness-soft" : "bg-paper"
            }`}
            title={d.workout ? d.workout.name : "Rest / active recovery"}
          >
            <span className="block text-[10px] font-semibold uppercase text-muted">{d.label}</span>
            <span className={`block text-base ${d.workout ? "" : "opacity-40"}`} aria-hidden>
              {d.workout ? "🏋️" : "💤"}
            </span>
          </div>
        ))}
      </div>

      {/* The workouts, each expandable to per-exercise form videos */}
      <div className="mt-3 space-y-1.5">
        {plan.workouts.map((w) => {
          const isOpen = openWorkout === w.id;
          return (
            <div key={w.id} className="rounded-xl border border-line">
              <button
                onClick={() => setOpenWorkout(isOpen ? null : w.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{w.name}</span>
                  <span className="block text-[11px] text-muted">
                    {w.durationMin} min · {LEVEL_META[w.level].label} · {w.focus}
                  </span>
                </span>
                <span className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>
                  ›
                </span>
              </button>
              {isOpen ? (
                <ul className="border-t border-line px-3 py-2 space-y-1">
                  {w.exercises.map((ex) => (
                    <li key={ex.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0">
                        <span className="font-medium">{ex.name}</span>
                        <span className="text-muted"> · {ex.target}</span>
                      </span>
                      <a
                        href={formVideoUrl(ex.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 font-semibold text-fitness-bright hover:underline"
                        title={`Watch proper form for ${ex.name}`}
                      >
                        ▶ Form
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Meal prep */}
      <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Batch-cook this week
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {plan.meals.map((m) => (
          <div key={m.id} className="rounded-xl border border-line bg-paper p-2.5">
            <p className="text-[13px] font-semibold leading-snug">{m.title}</p>
            <p className="mt-0.5 text-[11px] text-muted">{m.description}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">
                <span className="font-semibold text-ink">{m.calories} cal</span> · {m.timeMin} min
              </span>
              <a
                href={recipeVideoUrl(m.title)}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-meals-bright hover:underline"
                title={`Watch how to make ${m.title}`}
              >
                ▶ Watch
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Grocery list */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="btn-primary !px-3 !py-1.5 text-xs"
          onClick={() => {
            const n = addGroceryItems(plan.groceries);
            setGroceryMsg(
              n === 0
                ? "Everything's already on your list or in your pantry ✓"
                : `Added ${n} ${n === 1 ? "item" : "items"} to your grocery list ✓`,
            );
            setTimeout(() => setGroceryMsg(null), 5000);
          }}
        >
          🛒 Add {plan.groceries.length} groceries to my list
        </button>
        <span className="text-[11px] text-muted">{plan.groceries.length} ingredients across the meals</span>
      </div>
      {groceryMsg ? <p className="mt-1.5 text-xs text-meals-bright">{groceryMsg}</p> : null}
    </Card>
  );
}
