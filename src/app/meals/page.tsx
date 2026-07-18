"use client";

import { useMemo, useState } from "react";
import { Card, Checkbox, EmptyState, InlineAdd, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { CalorieTracker } from "@/components/CalorieTracker";
import { RecipeSearch } from "@/components/RecipeSearch";
import { SectionTasks } from "@/components/SectionTasks";
import { WeekPlanner } from "@/components/WeekPlanner";
import { nowISO, todayISO } from "@/core/dates";
import { matchRecipes, recipeVideoUrl } from "@/core/selectors";
import { newId, useHub, useHydrated } from "@/core/store/hub";
import { useUndo } from "@/core/store/undo";
import type { DeliveryService, PantryCategory, Recipe } from "@/core/types";

const STORE_LABEL: Record<DeliveryService, string> = {
  whole_foods: "Whole Foods",
  aldi: "Aldi",
  instacart: "Instacart",
};

// Where "Order on …" opens. These stores don't accept a prefilled cart URL, so
// Vela copies the list to the clipboard and opens the store ready to paste.
const STORE_URL: Record<DeliveryService, string> = {
  whole_foods: "https://www.amazon.com/alm/storefront?almBrandId=VUZHIFdob2xlIEZvb2Rz",
  aldi: "https://shop.aldi.us/",
  instacart: "https://www.instacart.com/store",
};

function CookFromKitchen() {
  const state = useHub();
  const planMeal = useHub((s) => s.planMeal);
  const matches = matchRecipes(state);
  const ready = matches.filter((m) => m.ready);
  const almost = matches.filter((m) => !m.ready);
  const [planned, setPlanned] = useState<string | null>(null);

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-meals" aria-hidden />
      <SectionTitle
        right={
          <span className="text-xs text-muted">
            {ready.length} ready · {almost.length} almost
          </span>
        }
      >
        What you can cook right now
      </SectionTitle>
      <p className="mb-3 text-xs text-muted">
        Matched against your pantry and everything on the grocery list — so nothing goes to waste.
      </p>
      {matches.length === 0 ? (
        <EmptyState>Check off more pantry items to unlock recipe matches.</EmptyState>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {matches.slice(0, 8).map(({ recipe, missing, ready: isReady }) => (
            <div key={recipe.id} className="flex flex-col rounded-xl border border-line bg-paper p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold leading-snug">{recipe.title}</p>
                <span
                  className={`chip shrink-0 !text-[10px] ${
                    isReady ? "bg-meals-soft text-meals-bright" : "border border-line text-muted"
                  }`}
                >
                  {isReady ? "ready now" : `missing ${missing.length}`}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">{recipe.description}</p>
              <p className="mt-1.5 text-[11px] text-muted">
                <span className="font-semibold text-ink">{recipe.calories} cal</span> / serving ·{" "}
                {recipe.timeMin} min
              </p>
              {!isReady ? (
                <p className="mt-1 text-[11px] text-school-bright">
                  needs: {missing.join(", ")}
                </p>
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="btn-ghost self-start !px-2.5 !py-1 text-[11px]"
                  onClick={() => {
                    planMeal(todayISO(), "dinner", recipe.title, recipe.id);
                    setPlanned(recipe.id);
                    setTimeout(() => setPlanned(null), 2500);
                  }}
                >
                  {planned === recipe.id ? "Planned ✓" : "Plan for dinner"}
                </button>
                <a
                  href={recipeVideoUrl(recipe.title)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-meals-bright hover:underline"
                  title={`Watch how to make ${recipe.title}`}
                >
                  ▶ Watch
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

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
  const removePantryItem = useHub((s) => s.removePantryItem);
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
                  onRemove={() => removePantryItem(item.id)}
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
        Builds a seafood or plant-based meal (no meat, no dairy) from the {onHand.length} ingredients
        you have checked off.
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
          <div className="mt-3 flex items-center gap-3">
            <button
              className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() => planMeal(todayISO(), "dinner", recipe.title, recipe.id)}
            >
              Add to tonight&apos;s plan
            </button>
            <a
              href={recipeVideoUrl(recipe.title)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-meals-bright hover:underline"
              title={`Watch how to make ${recipe.title}`}
            >
              ▶ Watch how-to
            </a>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Groceries() {
  const groceryList = useHub((s) => s.groceryList);
  const generateGroceryList = useHub((s) => s.generateGroceryList);
  const clearGroceryList = useHub((s) => s.clearGroceryList);
  const addGroceryItem = useHub((s) => s.addGroceryItem);
  const removeGroceryItem = useHub((s) => s.removeGroceryItem);
  const restoreGroceryItem = useHub((s) => s.restoreGroceryItem);
  const pushUndo = useUndo((s) => s.push);
  const preferredStore = useHub((s) => s.preferredStore);
  const setPreferredStore = useHub((s) => s.setPreferredStore);
  const groceryConnections = useHub((s) => s.groceryConnections);
  const [sendState, setSendState] = useState<string>("");

  async function copyList() {
    const text = groceryList
      .filter((g) => !g.checked)
      .map((g) => `- ${g.name}${g.quantity !== "1" ? ` (${g.quantity})` : ""}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setSendState("List copied — paste it into any store app.");
    } catch {
      setSendState("Couldn't access the clipboard.");
    }
  }

  async function sendTo(service: DeliveryService) {
    const items = groceryList.filter((g) => !g.checked);
    if (items.length === 0) {
      setSendState("Nothing to order — the list is empty.");
      return;
    }
    // Open the store right away (synchronously, so it isn't popup-blocked)…
    window.open(STORE_URL[service], "_blank", "noopener");
    // …and copy the list so it's ready to paste into the store.
    const text = items
      .map((g) => `${g.name}${g.quantity !== "1" ? ` (${g.quantity})` : ""}`)
      .join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
    setSendState(`List copied & ${STORE_LABEL[service]} opened — paste it to finish your order.`);
    // Also forward to a configured delivery webhook, if the user set one up.
    try {
      const res = await fetch("/api/webhooks/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, url: groceryConnections[service], items }),
      });
      const data = (await res.json()) as { status: string };
      if (data.status === "forwarded") {
        setSendState(`List copied, ${STORE_LABEL[service]} opened & order forwarded ✓`);
      }
    } catch {
      /* the store already opened with the list copied — webhook is a bonus */
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
                  onChange={() => {
                    removeGroceryItem(g.id);
                    pushUndo(`Checked off ${g.name}`, () => restoreGroceryItem(g));
                  }}
                  onRemove={() => {
                    removeGroceryItem(g.id);
                    pushUndo(`Removed ${g.name}`, () => restoreGroceryItem(g));
                  }}
                  label={g.name}
                  sub={g.quantity !== "1" ? g.quantity : undefined}
                  vanish
                />
              ))}
            </div>
            <InlineAdd placeholder="Add grocery item" onAdd={(name) => addGroceryItem(name)} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted">
                My store
                <select
                  value={preferredStore}
                  onChange={(e) => setPreferredStore(e.target.value as DeliveryService)}
                  className="input !w-auto !py-1.5 text-xs"
                >
                  {(Object.keys(STORE_LABEL) as DeliveryService[]).map((s) => (
                    <option key={s} value={s}>{STORE_LABEL[s]}</option>
                  ))}
                </select>
              </label>
              <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => void sendTo(preferredStore)}>
                🛒 Order on {STORE_LABEL[preferredStore]}
              </button>
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void copyList()}>
                Copy list
              </button>
              <button
                className="btn-ghost !px-3 !py-1.5 text-xs !text-fitness-bright hover:!border-fitness"
                onClick={clearGroceryList}
              >
                Clear
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
        subtitle="Seafood & plant-based · no meat, no dairy. Check what you have — the engine does the rest."
      />
      <CalorieTracker />
      <RecipeSearch />
      <CookFromKitchen />
      <ReverseRecipeEngine />
      <WeekPlanner />
      <Groceries />
      <Pantry />
      <SectionTasks domain="meals" title="Meal & grocery tasks" />
    </div>
  );
}
