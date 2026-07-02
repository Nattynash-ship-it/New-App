"use client";

import { useMemo, useState } from "react";
import { Card, Checkbox, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { WeekPlanner } from "@/components/WeekPlanner";
import { nowISO, todayISO } from "@/core/dates";
import { newId, useHub, useHydrated } from "@/core/store/hub";
import type { DeliveryService, PantryCategory, Recipe } from "@/core/types";

const CATEGORY_ORDER: PantryCategory[] = ["produce", "protein", "grains", "pantry", "frozen", "spices"];
const CATEGORY_LABEL: Record<PantryCategory, string> = {
  produce: "Produce",
  protein: "Protein",
  grains: "Grains",
  pantry: "Pantry",
  frozen: "Frozen",
  spices: "Spices & Flavor",
};

function Pantry() {
  const pantry = useHub((s) => s.pantry);
  const togglePantryItem = useHub((s) => s.togglePantryItem);
  const addPantryItem = useHub((s) => s.addPantryItem);
  const [newItem, setNewItem] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<PantryCategory, typeof pantry>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of pantry) map.get(item.category)?.push(item);
    return map;
  }, [pantry]);

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">check = on hand</span>}>
        Pantry
      </SectionTitle>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {CATEGORY_LABEL[cat]}
              </p>
              {items.map((item) => (
                <Checkbox
                  key={item.id}
                  checked={item.onHand}
                  onChange={() => togglePantryItem(item.id)}
                  label={item.name}
                  strike={false}
                />
              ))}
            </div>
          );
        })}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newItem.trim()) {
            addPantryItem(newItem.trim(), "pantry");
            setNewItem("");
          }
        }}
      >
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add pantry item"
          className="input !py-1.5 text-xs"
        />
        <button className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" disabled={!newItem.trim()}>
          Add
        </button>
      </form>
    </Card>
  );
}

function ReverseRecipeEngine() {
  const pantry = useHub((s) => s.pantry);
  const saveRecipe = useHub((s) => s.saveRecipe);
  const planMeal = useHub((s) => s.planMeal);
  const [busy, setBusy] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [engine, setEngine] = useState<string>("");
  const [error, setError] = useState("");

  const onHand = pantry.filter((p) => p.onHand);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: onHand.map((p) => p.name) }),
      });
      if (!res.ok) throw new Error(`Recipe engine returned ${res.status}`);
      const data = (await res.json()) as { recipe: Omit<Recipe, "id" | "createdAt">; engine: string };
      const full: Recipe = { ...data.recipe, id: newId("rec"), createdAt: nowISO() };
      setRecipe(full);
      setEngine(data.engine);
      saveRecipe(full);
    } catch {
      setError("Couldn't reach the recipe engine — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle
        right={
          engine ? (
            <span className="chip bg-meals-soft text-meals-bright">
              {engine === "claude" ? "AI-generated" : "On-device"}
            </span>
          ) : undefined
        }
      >
        Reverse Recipe Engine
      </SectionTitle>
      <p className="text-xs text-muted">
        Builds a vegan, high-volume / low-calorie meal from the {onHand.length} ingredients you have
        checked off.
      </p>
      <button className="btn-primary mt-3" onClick={() => void generate()} disabled={busy || onHand.length === 0}>
        {busy ? "Cooking up ideas…" : "Generate a meal from my pantry"}
      </button>
      {error ? <p className="mt-2 text-xs text-fitness-bright">{error}</p> : null}

      {recipe ? (
        <div className="mt-4 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg">{recipe.title}</h3>
            <span className="shrink-0 text-xs text-muted">~{recipe.calories} cal</span>
          </div>
          <p className="mt-1 text-xs text-muted">{recipe.description}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Ingredients
              </p>
              <ul className="space-y-0.5 text-xs">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>
                    {ing.name} <span className="text-muted">· {ing.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Method
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-xs">
                {recipe.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
          <button
            className="btn-ghost mt-3 !px-3 !py-1.5 text-xs"
            onClick={() => planMeal(todayISO(), "dinner", recipe.title, recipe.id)}
          >
            Add to tonight&apos;s plan
          </button>
        </div>
      ) : null}
    </Card>
  );
}

function Groceries() {
  const groceryList = useHub((s) => s.groceryList);
  const generateGroceryList = useHub((s) => s.generateGroceryList);
  const toggleGroceryItem = useHub((s) => s.toggleGroceryItem);
  const [sendState, setSendState] = useState<string>("");

  async function sendTo(service: DeliveryService) {
    setSendState("sending");
    try {
      const res = await fetch("/api/webhooks/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, items: groceryList.filter((g) => !g.checked) }),
      });
      const data = (await res.json()) as { status: string; message?: string };
      setSendState(
        data.status === "forwarded"
          ? `Sent to ${service === "whole_foods" ? "Whole Foods" : "Aldi"} ✓`
          : data.message ?? "Captured — delivery integration pending.",
      );
    } catch {
      setSendState("Couldn't reach the delivery service.");
    }
  }

  return (
    <Card>
        <SectionTitle
          right={
            <button className="btn-ghost !px-3 !py-1 text-xs" onClick={generateGroceryList}>
              Regenerate
            </button>
          }
        >
          Grocery list
        </SectionTitle>
        {groceryList.length === 0 ? (
          <EmptyState>
            Generate a list from your planned meals and anything unchecked in the pantry.
          </EmptyState>
        ) : (
          <>
            <div className="space-y-0.5">
              {groceryList.map((g) => (
                <Checkbox
                  key={g.id}
                  checked={g.checked}
                  onChange={() => toggleGroceryItem(g.id)}
                  label={g.name}
                  sub={g.quantity !== "1" ? g.quantity : undefined}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void sendTo("whole_foods")}>
                Send to Whole Foods
              </button>
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void sendTo("aldi")}>
                Send to Aldi
              </button>
            </div>
            {sendState && sendState !== "sending" ? (
              <p className="mt-2 text-xs text-muted">{sendState}</p>
            ) : null}
          </>
        )}
    </Card>
  );
}

export default function MealsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Nutrition"
        title="Meals & groceries"
        subtitle="Vegan, high-volume defaults. Check what you have — the engine does the rest."
      />
      <ReverseRecipeEngine />
      <WeekPlanner />
      <Groceries />
      <Pantry />
    </div>
  );
}
