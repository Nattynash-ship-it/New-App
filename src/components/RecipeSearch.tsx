"use client";

import { useState } from "react";
import { Card, SectionTitle } from "./ui";
import { MicButton } from "./MicButton";
import { RECIPE_LIBRARY } from "@/core/data/recipeLibrary";
import { recipeVideoUrl } from "@/core/selectors";
import { todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";

/**
 * Search ANY recipe — matches the built-in library and everything you've saved
 * (by title or ingredient), and for anything else offers the web: a how-to
 * video and a full recipe search, plus one tap to plan it for dinner anyway.
 */
export function RecipeSearch() {
  const saved = useHub((s) => s.recipes);
  const planMeal = useHub((s) => s.planMeal);
  const removeRecipe = useHub((s) => s.removeRecipe);
  const [q, setQ] = useState("");
  const [planned, setPlanned] = useState<string | null>(null);

  const needle = q.trim().toLowerCase();
  const local = needle
    ? [
        ...RECIPE_LIBRARY.map((r) => ({
          id: r.id,
          title: r.title,
          sub: `${r.calories} cal · ${r.timeMin} min`,
          hay: `${r.title} ${r.ingredients.join(" ")}`.toLowerCase(),
          saved: false,
        })),
        ...saved.map((r) => ({
          id: r.id,
          title: r.title,
          sub: `${r.calories} cal · saved`,
          hay: `${r.title} ${r.ingredients.map((i) => i.name).join(" ")}`.toLowerCase(),
          saved: true,
        })),
      ].filter((r) => r.hay.includes(needle))
    : [];

  function plan(title: string, recipeId?: string) {
    planMeal(todayISO(), "dinner", title, recipeId);
    setPlanned(title);
    setTimeout(() => setPlanned(null), 3000);
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">yours · library · the web</span>}>
        Find any recipe
      </SectionTitle>
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search anything — "salmon", "shrimp tacos", "tofu", "high protein"…'
          className="input flex-1 !py-2 text-sm"
          aria-label="Search recipes"
        />
        <MicButton value={q} onChange={setQ} />
      </div>

      {planned ? (
        <p className="mt-2 rounded-xl bg-meals-soft px-3 py-1.5 text-xs text-meals-bright">
          Planned “{planned}” for dinner ✓
        </p>
      ) : null}

      {needle ? (
        <div className="mt-3 space-y-1.5">
          {local.map((r) => (
            <div key={r.id} className="group flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.title}</span>
                <span className="block text-[11px] text-muted">{r.sub}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <a
                  href={recipeVideoUrl(r.title)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-meals-bright hover:underline"
                >
                  ▶ Watch
                </a>
                <button onClick={() => plan(r.title, r.id)} className="btn-ghost !px-2.5 !py-1 text-[11px]">
                  Plan dinner
                </button>
                {r.saved ? (
                  <button
                    onClick={() => removeRecipe(r.id)}
                    aria-label={`Delete saved recipe ${r.title}`}
                    className="rounded-full px-1 text-sm text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                  >
                    ×
                  </button>
                ) : null}
              </span>
            </div>
          ))}

          {/* The web catches everything the libraries don't. */}
          <div className="rounded-xl border border-dashed border-line px-3 py-2.5">
            <p className="text-xs font-medium">
              {local.length === 0 ? `Nothing saved matches “${q.trim()}” — the web has it:` : "Want more options?"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${q.trim()} recipe`)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-accent hover:underline"
              >
                🔍 Search recipes for “{q.trim()}”
              </a>
              <a
                href={recipeVideoUrl(q.trim())}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-meals-bright hover:underline"
              >
                ▶ Video how-to
              </a>
              <button onClick={() => plan(q.trim())} className="btn-ghost !px-2.5 !py-1 text-[11px]">
                Plan it for dinner
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          Searches your saved recipes and the built-in library — and anything else on the web.
        </p>
      )}
    </Card>
  );
}
