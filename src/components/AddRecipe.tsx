"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { MicButton } from "./MicButton";
import { nowISO } from "@/core/dates";
import { newId, useHub } from "@/core/store/hub";
import type { Recipe } from "@/core/types";

/** Split a pasted ingredient block (commas or new lines) into clean names. */
function parseIngredients(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]+/)) {
    const name = raw.trim().replace(/^[-•*]\s*/, "");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Add your own recipe. On save it's stored in your recipe box AND its
 * ingredients are immediately pulled onto your grocery list — no retyping.
 */
export function AddRecipe() {
  const saveRecipe = useHub((s) => s.saveRecipe);
  const addGroceryItems = useHub((s) => s.addGroceryItems);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [calories, setCalories] = useState("");
  const [msg, setMsg] = useState("");

  const parsed = parseIngredients(ingredients);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || parsed.length === 0) return;
    const recipe: Recipe = {
      id: newId("rec"),
      title: t,
      description: "Your recipe",
      ingredients: parsed.map((name) => ({ name, quantity: "" })),
      steps: steps
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
      calories: Math.max(0, parseInt(calories, 10) || 0),
      volumeScore: "medium",
      vegan: false,
      source: "user",
      createdAt: nowISO(),
    };
    saveRecipe(recipe);
    const added = addGroceryItems(parsed); // immediate ingredient extraction
    setMsg(
      `Saved “${t}” — ${added} ingredient${added === 1 ? "" : "s"} added to your grocery list${
        added < parsed.length ? " (the rest you already have)" : ""
      }.`,
    );
    setTitle("");
    setIngredients("");
    setSteps("");
    setCalories("");
    setTimeout(() => setMsg(""), 6000);
  }

  return (
    <Card>
      <SectionTitle
        right={
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "+ Add recipe"}
          </button>
        }
      >
        Add your own recipe
      </SectionTitle>
      {!open ? (
        <p className="-mt-1 text-xs text-muted">
          Paste a recipe — Vela saves it and pulls the ingredients straight onto your grocery list.
        </p>
      ) : (
        <form className="space-y-2" onSubmit={save}>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe name (e.g. Chickpea curry)"
              className="input !py-2 text-sm"
            />
            <MicButton value={title} onChange={setTitle} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Ingredients <span className="font-normal normal-case">(one per line, or comma-separated)</span>
            </label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder={"chickpeas\ncoconut milk\nspinach\nonion\nsmoked paprika"}
              rows={4}
              className="input !py-2 text-sm"
            />
            {parsed.length > 0 ? (
              <p className="mt-1 text-[11px] text-meals-bright">
                {parsed.length} ingredient{parsed.length === 1 ? "" : "s"} detected — added to groceries on save.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-muted">
              <span className="mb-1 block font-semibold uppercase tracking-wider">Calories / serving</span>
              <input
                type="number"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="optional"
                className="input !w-32 !py-2 text-sm"
              />
            </label>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Steps <span className="font-normal normal-case">(optional, one per line)</span>
            </label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={"Sauté onion\nAdd spices\nSimmer with coconut milk"}
              rows={2}
              className="input !py-2 text-sm"
            />
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={!title.trim() || parsed.length === 0}>
            Save &amp; extract ingredients →
          </button>
          {msg ? <p className="text-xs text-meals-bright">{msg}</p> : null}
        </form>
      )}
    </Card>
  );
}
