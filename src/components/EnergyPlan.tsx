"use client";

import { Card, DOMAIN_STYLES, SectionTitle } from "./ui";
import { ENERGY_META, todaysPlan } from "@/core/selectors";
import { formatTime, todayISO } from "@/core/dates";
import { useHub } from "@/core/store/hub";
import type { EnergyLevel } from "@/core/types";

const LEVELS: EnergyLevel[] = ["low", "steady", "high"];

/**
 * Energy-aware plan for today. You tell Vela your capacity in one tap and it
 * builds a realistic plan — fixed commitments always show, flexible work fills
 * the rest, and anything over capacity is reported as "moved off today" rather
 * than looming. The antidote to an endless to-do list on a hard day.
 */
export function EnergyPlan() {
  const energy = useHub((s) => s.energyLog[todayISO()]);
  const setEnergy = useHub((s) => s.setEnergy);
  const state = useHub();

  return (
    <Card>
      <SectionTitle
        right={
          <div className="flex items-center gap-1">
            {LEVELS.map((lvl) => {
              const meta = ENERGY_META[lvl];
              const active = energy === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setEnergy(lvl)}
                  aria-pressed={active}
                  title={`${meta.label} energy`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-ink/25"
                  }`}
                >
                  <span aria-hidden>{meta.icon}</span>
                  <span className="hidden sm:inline">{meta.label}</span>
                </button>
              );
            })}
          </div>
        }
      >
        Today&apos;s plan
      </SectionTitle>

      {!energy ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
          <p className="text-sm font-medium">How&apos;s your energy today?</p>
          <p className="mt-1 text-xs text-muted">
            One tap and Vela right-sizes your day — lighter when you&apos;re running low, fuller when
            you&apos;ve got room.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {LEVELS.map((lvl) => {
              const meta = ENERGY_META[lvl];
              return (
                <button
                  key={lvl}
                  onClick={() => setEnergy(lvl)}
                  className="btn-ghost !px-3.5 !py-2 text-sm"
                >
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <Plan energy={energy} state={state} />
      )}
    </Card>
  );
}

function Plan({ energy, state }: { energy: EnergyLevel; state: ReturnType<typeof useHub.getState> }) {
  const { items, deferred, message } = todaysPlan(state, energy);

  return (
    <div>
      <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent">{message}</p>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Nothing pressing today — a rare open day. Enjoy it. ✦
        </p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((item) => {
            const style = DOMAIN_STYLES[item.domain];
            return (
              <li
                key={`${item.domain}-${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                <span className={`chip shrink-0 ${style.soft} ${style.text} !text-[10px]`}>{item.tag}</span>
                {item.time ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted">{formatTime(item.time)}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {deferred > 0 ? (
        <p className="mt-3 text-xs text-muted">
          <span className="font-medium text-ink">{deferred}</span> more{" "}
          {deferred === 1 ? "item is" : "items are"} waiting — they&apos;ll keep until you have room.
          {energy !== "high" ? " Feeling up for more? Bump your energy above." : ""}
        </p>
      ) : null}
    </div>
  );
}
