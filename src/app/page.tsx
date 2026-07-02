"use client";

import { useState } from "react";
import { QuickAdd } from "@/components/QuickAdd";
import { Card, DOMAIN_STYLES, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { formatTime, todayISO } from "@/core/dates";
import { selectTimeline } from "@/core/selectors";
import { useHub, useHydrated } from "@/core/store/hub";
import type { CheckInPeriod, Mood } from "@/core/types";

const MOODS: Array<{ value: Mood; face: string; label: string }> = [
  { value: 1, face: "◦", label: "Heavy" },
  { value: 2, face: "◔", label: "Low" },
  { value: 3, face: "◑", label: "Okay" },
  { value: 4, face: "◕", label: "Good" },
  { value: 5, face: "●", label: "Great" },
];

function greeting(): { word: string; period: CheckInPeriod } {
  const h = new Date().getHours();
  if (h < 12) return { word: "Good morning", period: "morning" };
  if (h < 17) return { word: "Good afternoon", period: "morning" };
  return { word: "Good evening", period: "evening" };
}

function CheckInCard() {
  const { period } = greeting();
  const checkIns = useHub((s) => s.checkIns);
  const addCheckIn = useHub((s) => s.addCheckIn);
  const existing = checkIns.find((c) => c.date === todayISO() && c.period === period);

  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");

  const promptText =
    period === "morning" ? "One intention for today" : "One good thing about today";

  if (existing) {
    return (
      <Card>
        <SectionTitle>
          {period === "morning" ? "Morning check-in" : "Evening check-in"} · done
        </SectionTitle>
        <p className="text-sm text-muted">
          Mood {MOODS.find((m) => m.value === existing.mood)?.label.toLowerCase()}
          {existing.note ? ` — “${existing.note}”` : ""}. See you{" "}
          {period === "morning" ? "tonight" : "tomorrow morning"}.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>
        {period === "morning" ? "Morning check-in" : "Evening check-in"}
        <span className="ml-2 font-normal text-muted">~20 seconds</span>
      </SectionTitle>
      <div className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMood(m.value)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-lg transition-all ${
              mood === m.value
                ? "border-accent bg-accent-soft text-accent-dark"
                : "border-line text-muted hover:border-ink/25"
            }`}
            aria-pressed={mood === m.value}
          >
            <span aria-hidden>{m.face}</span>
            <span className="text-[10px] font-medium">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={promptText}
          className="input"
          maxLength={140}
        />
        <button
          className="btn-primary shrink-0"
          disabled={mood === null}
          onClick={() => {
            if (mood !== null) addCheckIn(period, mood, note.trim(), promptText);
          }}
        >
          Save
        </button>
      </div>
    </Card>
  );
}

function MoodStrip() {
  const checkIns = useHub((s) => s.checkIns);
  const recent = [...checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7);
  if (recent.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <span>Last check-ins:</span>
      {recent.map((c) => (
        <span
          key={c.id}
          title={`${c.date} ${c.period}`}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] text-accent-dark"
        >
          {MOODS.find((m) => m.value === c.mood)?.face}
        </span>
      ))}
    </div>
  );
}

function Timeline() {
  const state = useHub();
  const entries = selectTimeline(state, todayISO());

  return (
    <Card>
      <SectionTitle>
        Today, all in one view
        <span className="ml-2 font-normal text-muted">
          {entries.length} item{entries.length === 1 ? "" : "s"}
        </span>
      </SectionTitle>
      {entries.length === 0 ? (
        <EmptyState>A clear day. Add something above, or enjoy the space.</EmptyState>
      ) : (
        <ol className="relative ml-2 space-y-0">
          {entries.map((e, i) => {
            const style = DOMAIN_STYLES[e.domain];
            return (
              <li key={e.id} className="relative flex gap-4 pb-4 last:pb-0">
                {i < entries.length - 1 ? (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden />
                ) : null}
                <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${style.dot}`} />
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted">
                      <span className={style.text}>{style.label}</span>
                      {e.subtitle ? ` · ${e.subtitle}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {e.time ? formatTime(e.time) : "All day"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export default function CompassPage() {
  const hydrated = useHydrated();
  const { word } = greeting();

  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Daily Compass ·{" "}
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">{word}, Natasha</h1>
        <div className="mt-2">
          <MoodStrip />
        </div>
      </header>

      <QuickAdd />
      <CheckInCard />
      <Timeline />
    </div>
  );
}
