"use client";

import { useState } from "react";
import { Card, EmptyState, ProgressBar, SectionTitle } from "./ui";
import { foodDay, weightStats } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

function GoalRow({
  label,
  value,
  goal,
  unit,
  colorClass,
  overLabel,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  colorClass: string;
  overLabel: string;
}) {
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  const left = goal - value;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">
          <span className="font-semibold text-ink">{value}</span> / {goal} {unit}
        </span>
      </div>
      <ProgressBar pct={pct} colorClass={colorClass} />
      <p className="mt-1 text-[11px] text-muted">
        {left >= 0 ? `${left} ${unit} ${label === "Protein" ? "to go" : "left"}` : `${overLabel} by ${Math.abs(left)} ${unit}`}
      </p>
    </div>
  );
}

export function CalorieTracker() {
  const state = useHub();
  const logFood = useHub((s) => s.logFood);
  const removeFoodEntry = useHub((s) => s.removeFoodEntry);
  const setCalorieGoal = useHub((s) => s.setCalorieGoal);
  const setProteinGoal = useHub((s) => s.setProteinGoal);

  const day = foodDay(state);
  const wStats = weightStats(state);

  const [name, setName] = useState("");
  const [cals, setCals] = useState("");
  const [protein, setProtein] = useState("");
  const [editing, setEditing] = useState(false);
  const [calGoalDraft, setCalGoalDraft] = useState("");
  const [proGoalDraft, setProGoalDraft] = useState("");

  // Protein suggestion tied to the program's 0.7–1 g/lb rule, using logged weight.
  const suggestedProtein =
    wStats.latest !== null
      ? Math.round((wStats.unit === "kg" ? wStats.latest * 2.2046226218 : wStats.latest) * 0.8)
      : null;

  function submit() {
    const c = parseInt(cals, 10);
    if (!name.trim() || !Number.isFinite(c)) return;
    const p = parseInt(protein, 10);
    logFood(name.trim(), c, Number.isFinite(p) ? p : undefined);
    setName("");
    setCals("");
    setProtein("");
  }

  function saveGoals() {
    const c = parseInt(calGoalDraft, 10);
    const p = parseInt(proGoalDraft, 10);
    if (Number.isFinite(c)) setCalorieGoal(c);
    if (Number.isFinite(p)) setProteinGoal(p);
    setEditing(false);
  }

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-meals" aria-hidden />
      <SectionTitle
        right={
          <button
            className="btn-ghost !px-2.5 !py-1 text-[11px]"
            onClick={() => {
              setCalGoalDraft(String(state.calorieGoal));
              setProGoalDraft(String(state.proteinGoal));
              setEditing((v) => !v);
            }}
          >
            {editing ? "Close" : "Goals"}
          </button>
        }
      >
        Today&apos;s food & calories
      </SectionTitle>

      {editing ? (
        <form
          className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-paper p-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveGoals();
          }}
        >
          <label className="text-xs text-muted">
            <span className="mb-1 block">Daily calories</span>
            <input
              type="number"
              inputMode="numeric"
              value={calGoalDraft}
              onChange={(e) => setCalGoalDraft(e.target.value)}
              className="input !w-28 !py-1.5 text-xs"
            />
          </label>
          <label className="text-xs text-muted">
            <span className="mb-1 block">Protein (g)</span>
            <input
              type="number"
              inputMode="numeric"
              value={proGoalDraft}
              onChange={(e) => setProGoalDraft(e.target.value)}
              className="input !w-24 !py-1.5 text-xs"
            />
          </label>
          <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs">
            Save
          </button>
          {suggestedProtein !== null ? (
            <button
              type="button"
              className="btn-ghost !px-2.5 !py-1.5 text-[11px]"
              onClick={() => setProGoalDraft(String(suggestedProtein))}
              title="0.8 g per lb of your latest logged weight"
            >
              Use {suggestedProtein}g (0.8 g/lb)
            </button>
          ) : null}
        </form>
      ) : null}

      {/* Totals vs goals */}
      <div className="grid gap-3 sm:grid-cols-2">
        <GoalRow label="Calories" value={day.calories} goal={day.calorieGoal} unit="cal" colorClass="bg-meals" overLabel="Over" />
        <GoalRow label="Protein" value={day.protein} goal={day.proteinGoal} unit="g" colorClass="bg-fitness" overLabel="Over" />
      </div>

      {/* Quick add */}
      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Food (e.g. Greek yogurt bowl)"
          className="input min-w-[150px] flex-1 !py-1.5 text-xs"
        />
        <input
          type="number"
          inputMode="numeric"
          value={cals}
          onChange={(e) => setCals(e.target.value)}
          placeholder="cal"
          className="input !w-20 !py-1.5 text-xs"
          aria-label="Calories"
        />
        <input
          type="number"
          inputMode="numeric"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="protein g"
          className="input !w-24 !py-1.5 text-xs"
          aria-label="Protein in grams"
        />
        <button type="submit" className="btn-primary shrink-0 !px-3 !py-1.5 text-xs" disabled={!name.trim() || cals.trim() === ""}>
          Add
        </button>
      </form>

      {/* Today's entries */}
      {day.entries.length === 0 ? (
        <div className="mt-3">
          <EmptyState>Nothing logged yet today — add your first meal above.</EmptyState>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {day.entries.map((f) => (
            <li key={f.id} className="group flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">{f.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted tabular-nums">
                {f.calories} cal
                {f.protein ? ` · ${f.protein}g` : ""}
                <button
                  onClick={() => removeFoodEntry(f.id)}
                  aria-label={`Remove ${f.name}`}
                  className="rounded-full px-1 opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
