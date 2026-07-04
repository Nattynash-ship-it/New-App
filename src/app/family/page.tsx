"use client";

import { useState } from "react";
import { Card, EmptyState, InlineAdd, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { KidMeals } from "@/components/KidMeals";
import { MicButton } from "@/components/MicButton";
import { addDays, formatFriendly, formatTime, todayISO } from "@/core/dates";
import { useHub, useHydrated } from "@/core/store/hub";
import type { ActivityCategory } from "@/core/types";

function AddActivity() {
  const kids = useHub((s) => s.kids);
  const addActivity = useHub((s) => s.addActivity);
  const [title, setTitle] = useState("");
  const [kidId, setKidId] = useState("");
  const [date, setDate] = useState(addDays(todayISO(), 1));
  const [time, setTime] = useState("16:00");
  const [category, setCategory] = useState<ActivityCategory>("activity");

  return (
    <form
      className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        addActivity({ title: title.trim(), kidId: kidId || undefined, date, time, category });
        setTitle("");
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add activity or appointment" className="input min-w-[150px] flex-1 !py-1.5 text-xs" />
      <MicButton value={title} onChange={setTitle} />
      <select value={kidId} onChange={(e) => setKidId(e.target.value)} className="input !w-auto !py-1.5 text-xs" aria-label="Who">
        <option value="">Whole family</option>
        {kids.map((k) => (
          <option key={k.id} value={k.id}>{k.name}</option>
        ))}
      </select>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input !w-auto !py-1.5 text-xs" aria-label="Date" />
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input !w-auto !py-1.5 text-xs" aria-label="Time" />
      <select value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory)} className="input !w-auto !py-1.5 text-xs" aria-label="Type">
        <option value="activity">Activity</option>
        <option value="appointment">✚ Appointment</option>
        <option value="school">School event</option>
      </select>
      <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs" disabled={!title.trim()}>
        Add
      </button>
    </form>
  );
}

const CATEGORY_FILTERS = [
  { key: "all", label: "Everything" },
  { key: "appointment", label: "✚ Appointments" },
  { key: "activity", label: "Activities" },
  { key: "school", label: "School" },
] as const;

type FilterKey = (typeof CATEGORY_FILTERS)[number]["key"];

const CATEGORY_CHIP: Record<string, { classes: string; label: string }> = {
  appointment: { classes: "bg-fitness-soft text-fitness-bright", label: "✚ appointment" },
  school: { classes: "bg-school-soft text-school-bright", label: "school" },
};

function ActivityCalendar() {
  const activities = useHub((s) => s.activities);
  const kids = useHub((s) => s.kids);
  const removeActivity = useHub((s) => s.removeActivity);
  const setActivityPrepNote = useHub((s) => s.setActivityPrepNote);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  function saveNote(id: string) {
    setActivityPrepNote(id, noteDraft);
    setEditingNoteId(null);
    setNoteDraft("");
  }

  const upcoming = [...activities]
    .filter((a) => a.date >= todayISO())
    .filter((a) => filter === "all" || (a.category ?? "activity") === filter)
    .sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")));

  const apptCount = activities.filter(
    (a) => a.date >= todayISO() && a.category === "appointment",
  ).length;

  return (
    <Card>
      <SectionTitle
        right={
          apptCount > 0 ? (
            <span className="text-xs text-muted">
              {apptCount} appointment{apptCount === 1 ? "" : "s"} coming up
            </span>
          ) : undefined
        }
      >
        Kids&apos; schedule
      </SectionTitle>

      <AddActivity />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`chip border transition-colors ${
              filter === f.key
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-muted hover:border-ink/25"
            }`}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {upcoming.length === 0 ? (
        <EmptyState>
          {filter === "appointment"
            ? "No appointments coming up. Try “Dentist for Maya next Tuesday at 3pm”."
            : "Nothing coming up. Try “Soccer practice for Maya on Tuesday at 5pm”."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((a) => {
            const kid = kids.find((k) => k.id === a.kidId);
            const chip = a.category ? CATEGORY_CHIP[a.category] : undefined;
            return (
              <li key={a.id} className="group flex items-center gap-3 py-2.5">
                <span
                  className="h-8 w-8 shrink-0 rounded-full text-center text-sm font-semibold leading-8 text-white"
                  style={{ backgroundColor: kid?.color ?? "#87992D" }}
                  title={kid?.name ?? "Family"}
                >
                  {(kid?.name ?? "F").charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.title}
                    {chip ? <span className={`chip ml-2 !text-[10px] ${chip.classes}`}>{chip.label}</span> : null}
                    {a.recurring ? <span className="ml-1.5 text-[10px] text-muted">↻ weekly</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {kid?.name ?? "Whole family"} · {formatFriendly(a.date)}
                    {a.time ? ` · ${formatTime(a.time)}` : ""}
                  </p>
                  {editingNoteId === a.id ? (
                    <input
                      autoFocus
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onBlur={() => saveNote(a.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveNote(a.id);
                        if (e.key === "Escape") {
                          setEditingNoteId(null);
                          setNoteDraft("");
                        }
                      }}
                      placeholder="Prep note — what to bring or remember"
                      maxLength={120}
                      className="mt-1 w-full max-w-sm rounded-lg border border-accent/50 bg-surface px-2 py-1 text-xs outline-none"
                    />
                  ) : a.prepNote ? (
                    <button
                      onClick={() => {
                        setEditingNoteId(a.id);
                        setNoteDraft(a.prepNote ?? "");
                      }}
                      className="mt-0.5 block truncate text-left text-xs italic text-accent/80 hover:text-accent"
                      title="Edit prep note"
                    >
                      ↳ {a.prepNote}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNoteId(a.id);
                        setNoteDraft("");
                      }}
                      className="mt-0.5 text-xs text-muted/60 opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                    >
                      + prep note
                    </button>
                  )}
                </div>
                <button
                  onClick={() => removeActivity(a.id)}
                  className="rounded-full px-2 py-1 text-xs text-muted opacity-0 hover:bg-fitness-soft hover:text-fitness-bright group-hover:opacity-100"
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
  const addKid = useHub((s) => s.addKid);
  const removeKid = useHub((s) => s.removeKid);
  const addChore = useHub((s) => s.addChore);
  const removeChore = useHub((s) => s.removeChore);
  const addReward = useHub((s) => s.addReward);
  const removeReward = useHub((s) => s.removeReward);

  const [activeKidId, setActiveKidId] = useState<string | null>(kids[0]?.id ?? null);
  const [addingKid, setAddingKid] = useState(false);
  const [kidName, setKidName] = useState("");
  const activeKid = kids.find((k) => k.id === activeKidId) ?? kids[0];

  // Chores this kid has already completed today — locked until tomorrow.
  const today = todayISO();
  const doneToday = new Set(
    ledger
      .filter((t) => t.kidId === activeKid?.id && t.choreId && t.createdAt.slice(0, 10) === today)
      .map((t) => t.choreId),
  );

  return (
    <Card>
      <SectionTitle>The General Store</SectionTitle>

      {/* Kid picker + balances */}
      <div className="flex flex-wrap items-center gap-2">
        {kids.map((k) => (
          <span key={k.id} className="group/kid relative">
            <button
              onClick={() => setActiveKidId(k.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                k.id === activeKid?.id ? "border-family bg-family-soft" : "border-line hover:border-ink/25"
              }`}
              aria-pressed={k.id === activeKid?.id}
            >
              <span
                className="h-5 w-5 rounded-full text-center text-[11px] font-semibold leading-5 text-white"
                style={{ backgroundColor: k.color }}
              >
                {k.name.charAt(0)}
              </span>
              {k.name}
              <span className="font-semibold text-family-bright">{k.points} pts</span>
            </button>
            <button
              onClick={() => removeKid(k.id)}
              aria-label={`Remove ${k.name}`}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-fitness text-[9px] leading-none text-white group-hover/kid:flex"
            >
              ×
            </button>
          </span>
        ))}
        {addingKid ? (
          <form
            className="animate-slide-in flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (kidName.trim()) {
                addKid(kidName.trim());
                setKidName("");
                setAddingKid(false);
              }
            }}
          >
            <input
              autoFocus
              value={kidName}
              onChange={(e) => setKidName(e.target.value)}
              onBlur={() => !kidName.trim() && setAddingKid(false)}
              placeholder="Name"
              className="input !w-28 !py-1.5 text-xs"
            />
            <button type="submit" className="btn-ghost !px-2.5 !py-1.5 text-xs" disabled={!kidName.trim()}>
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingKid(true)}
            className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted hover:border-family hover:text-family-bright"
          >
            + Kid
          </button>
        )}
      </div>
      {!activeKid ? <EmptyState>Add a kid above to open the store.</EmptyState> : null}

      {activeKid ? (
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {/* Earn */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Earn — chores & progress
            </p>
            <ul className="space-y-1.5">
              {chores.map((c) => {
                const claimed = doneToday.has(c.id);
                return (
                <li key={c.id} className="group flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                  <span className={`text-sm ${claimed ? "text-muted line-through" : ""}`}>{c.title}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => completeChore(c.id, activeKid.id)}
                      disabled={claimed}
                      title={claimed ? "Already done today — resets tomorrow" : undefined}
                      className="btn-ghost !px-2.5 !py-1 text-xs !text-family-bright hover:!border-family disabled:!text-muted disabled:opacity-50"
                    >
                      {claimed ? "done ✓" : `+${c.points}`}
                    </button>
                    <button
                      onClick={() => removeChore(c.id)}
                      aria-label={`Delete chore ${c.title}`}
                      className="rounded-full px-1 text-sm text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                </li>
                );
              })}
            </ul>
            <InlineAdd
              placeholder='Add chore ("Water plants = 5")'
              onAdd={(value) => {
                const match = value.match(/^(.*?)(?:\s*=\s*(\d+))?$/);
                addChore((match?.[1] ?? value).trim(), Number(match?.[2]) || 5);
              }}
            />
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
                  <li key={r.id} className="group flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                    <span className={`text-sm ${affordable ? "" : "text-muted"}`}>{r.title}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => redeemReward(r.id, activeKid.id)}
                        disabled={!affordable}
                        className="btn-ghost !px-2.5 !py-1 text-xs"
                      >
                        {r.cost} pts
                      </button>
                      <button
                        onClick={() => removeReward(r.id)}
                        aria-label={`Delete reward ${r.title}`}
                        className="rounded-full px-1 text-sm text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <InlineAdd
              placeholder='Add reward ("Zoo trip = 200")'
              onAdd={(value) => {
                const match = value.match(/^(.*?)(?:\s*=\s*(\d+))?$/);
                addReward((match?.[1] ?? value).trim(), Number(match?.[2]) || 50);
              }}
            />
          </div>
        </div>
      ) : null}

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
                  <span className={tx.delta > 0 ? "text-meals-bright" : "text-fitness-bright"}>
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
      <KidMeals />
      <GeneralStore />
    </div>
  );
}
