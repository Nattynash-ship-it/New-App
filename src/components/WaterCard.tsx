"use client";

import { Card, SectionTitle } from "./ui";
import { waterToday } from "@/core/selectors";
import { useHub } from "@/core/store/hub";

/** Daily water intake — the reminder-and-streak model applied to hydration. */
export function WaterCard() {
  const cups = useHub(waterToday);
  const goal = useHub((s) => s.waterGoal);
  const logWater = useHub((s) => s.logWater);
  const setWaterGoal = useHub((s) => s.setWaterGoal);

  return (
    <Card>
      <SectionTitle
        right={
          <span className="flex items-center gap-1.5">
            <button className="btn-ghost !px-2.5 !py-0.5 text-sm" onClick={() => logWater(-1)} aria-label="Remove a cup">
              −
            </button>
            <button className="btn-primary !px-2.5 !py-0.5 text-sm" onClick={() => logWater(1)} aria-label="Add a cup">
              +
            </button>
          </span>
        }
      >
        Water intake
      </SectionTitle>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl">{cups}</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          / {goal} cups today
          <button
            className="ml-1 rounded px-1 leading-none hover:text-ink"
            onClick={() => setWaterGoal(goal - 1)}
            aria-label="Lower daily goal"
          >
            −
          </button>
          <button
            className="rounded px-1 leading-none hover:text-ink"
            onClick={() => setWaterGoal(goal + 1)}
            aria-label="Raise daily goal"
          >
            +
          </button>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: goal }, (_, i) => (
          <button
            key={i}
            onClick={() => logWater(i + 1 <= cups ? -(cups - i) : i + 1 - cups)}
            aria-label={`Set water to ${i + 1} cups`}
            className={`h-7 w-5 rounded-b-md rounded-t-sm border transition-all ${
              i < cups
                ? "animate-pop border-accent bg-accent-soft"
                : "border-line bg-transparent hover:border-accent"
            }`}
          >
            <span className="sr-only">{i + 1}</span>
          </button>
        ))}
      </div>
      {cups >= goal ? (
        <p className="mt-2 text-xs font-medium text-accent">Goal met — nicely done. 💧</p>
      ) : null}
    </Card>
  );
}
