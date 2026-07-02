"use client";

import { useState } from "react";
import { Card, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { formatFriendly, formatTime, todayISO } from "@/core/dates";
import { useHub, useHydrated } from "@/core/store/hub";

function ActivityCalendar() {
  const activities = useHub((s) => s.activities);
  const kids = useHub((s) => s.kids);
  const removeActivity = useHub((s) => s.removeActivity);

  const upcoming = [...activities]
    .filter((a) => a.date >= todayISO())
    .sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")));

  return (
    <Card>
      <SectionTitle>Kids&apos; schedule</SectionTitle>
      {upcoming.length === 0 ? (
        <EmptyState>Nothing coming up. Try “Soccer practice for Maya on Tuesday at 5pm”.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((a) => {
            const kid = kids.find((k) => k.id === a.kidId);
            return (
              <li key={a.id} className="group flex items-center gap-3 py-2.5">
                <span
                  className="h-8 w-8 shrink-0 rounded-full text-center text-sm font-semibold leading-8 text-white"
                  style={{ backgroundColor: kid?.color ?? "#2F6D5E" }}
                  title={kid?.name ?? "Family"}
                >
                  {(kid?.name ?? "F").charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.title}
                    {a.recurring ? <span className="ml-1.5 text-[10px] text-muted">↻ weekly</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {kid?.name ?? "Whole family"} · {formatFriendly(a.date)}
                    {a.time ? ` · ${formatTime(a.time)}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeActivity(a.id)}
                  className="rounded-full px-2 py-1 text-xs text-muted opacity-0 hover:bg-fitness-soft hover:text-fitness group-hover:opacity-100"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function GeneralStore() {
  const kids = useHub((s) => s.kids);
  const chores = useHub((s) => s.chores);
  const rewards = useHub((s) => s.rewards);
  const ledger = useHub((s) => s.ledger);
  const completeChore = useHub((s) => s.completeChore);
  const redeemReward = useHub((s) => s.redeemReward);

  const [activeKidId, setActiveKidId] = useState<string | null>(kids[0]?.id ?? null);
  const activeKid = kids.find((k) => k.id === activeKidId) ?? kids[0];

  if (!activeKid) return null;

  return (
    <Card>
      <SectionTitle>The General Store</SectionTitle>

      {/* Kid picker + balances */}
      <div className="flex flex-wrap gap-2">
        {kids.map((k) => (
          <button
            key={k.id}
            onClick={() => setActiveKidId(k.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              k.id === activeKid.id ? "border-family bg-family-soft" : "border-line hover:border-ink/25"
            }`}
            aria-pressed={k.id === activeKid.id}
          >
            <span
              className="h-5 w-5 rounded-full text-center text-[11px] font-semibold leading-5 text-white"
              style={{ backgroundColor: k.color }}
            >
              {k.name.charAt(0)}
            </span>
            {k.name}
            <span className="font-semibold text-family">{k.points} pts</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {/* Earn */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Earn — chores & progress
          </p>
          <ul className="space-y-1.5">
            {chores.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                <span className="text-sm">{c.title}</span>
                <button
                  onClick={() => completeChore(c.id, activeKid.id)}
                  className="btn-ghost shrink-0 !px-2.5 !py-1 text-xs !text-family hover:!border-family"
                >
                  +{c.points}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Spend */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Spend — rewards
          </p>
          <ul className="space-y-1.5">
            {rewards.map((r) => {
              const affordable = activeKid.points >= r.cost;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                  <span className={`text-sm ${affordable ? "" : "text-muted"}`}>{r.title}</span>
                  <button
                    onClick={() => redeemReward(r.id, activeKid.id)}
                    disabled={!affordable}
                    className="btn-ghost shrink-0 !px-2.5 !py-1 text-xs"
                  >
                    {r.cost} pts
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Ledger */}
      {ledger.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Recent activity
          </p>
          <ul className="space-y-1 text-xs text-muted">
            {ledger.slice(0, 5).map((tx) => {
              const kid = kids.find((k) => k.id === tx.kidId);
              return (
                <li key={tx.id} className="flex justify-between gap-3">
                  <span>
                    {kid?.name}: {tx.reason}
                  </span>
                  <span className={tx.delta > 0 ? "text-meals" : "text-fitness"}>
                    {tx.delta > 0 ? "+" : ""}
                    {tx.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export default function FamilyPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Family"
        title="Schedules & the store"
        subtitle="Every kid's activities in one calendar, and a points economy that runs itself."
      />
      <ActivityCalendar />
      <GeneralStore />
    </div>
  );
}
