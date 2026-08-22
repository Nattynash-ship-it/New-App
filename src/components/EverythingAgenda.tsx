"use client";

import { useMemo, useState } from "react";
import { Card, DOMAIN_STYLES, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import { useUndo } from "@/core/store/undo";
import { selectAgenda, type AgendaItem } from "@/core/selectors";
import { downloadICS, type CalEvent } from "@/lib/calendar";
import { formatShort, formatTime, todayISO } from "@/core/dates";

const KIND_ICON: Record<AgendaItem["kind"], string> = {
  task: "✓",
  assignment: "🎓",
  meeting: "💼",
  activity: "🏠",
  event: "✦",
  workout: "🏋️",
};

const BUCKET_TINT: Record<string, string> = {
  overdue: "text-fitness-bright",
  today: "text-accent",
};

function agendaToCal(items: AgendaItem[]): CalEvent[] {
  return items
    .filter((i) => i.date)
    .map((i) => ({
      id: i.id,
      title: i.title,
      date: i.date!,
      time: i.time,
      description: i.subtitle,
      durationMin: i.kind === "meeting" ? 30 : i.kind === "workout" ? 45 : 30,
    }));
}

export function EverythingAgenda() {
  const state = useHub();
  const agenda = useMemo(() => selectAgenda(state), [state]);
  const toggleTodo = useHub((s) => s.toggleTodo);
  const toggleAssignment = useHub((s) => s.toggleAssignment);
  const toggleProgramDay = useHub((s) => s.toggleProgramDay);
  const pushUndo = useUndo((s) => s.push);
  const [showLater, setShowLater] = useState(false);

  const today = todayISO();

  function complete(item: AgendaItem) {
    const undo = () => {
      if (item.kind === "task") toggleTodo(item.id);
      else if (item.kind === "assignment") toggleAssignment(item.id);
      else if (item.kind === "workout" && item.date) toggleProgramDay(item.date);
    };
    undo(); // toggles it done
    pushUndo(`Done: ${item.title}`, undo);
  }

  const alwaysKeys = new Set(["overdue", "today", "tomorrow"]);
  const primary = agenda.buckets.filter((b) => alwaysKeys.has(b.key));
  const laterBuckets = agenda.buckets.filter((b) => !alwaysKeys.has(b.key));
  const laterCount = laterBuckets.reduce((n, b) => n + b.items.length, 0);

  // Digest line
  const digest =
    agenda.dueNow === 0
      ? "You're all caught up for today ✨"
      : [
          agenda.overdue ? `${agenda.overdue} overdue` : "",
          agenda.today ? `${agenda.today} due today` : "",
        ]
          .filter(Boolean)
          .join(" · ");

  const dueSoonForCal = agenda.buckets
    .filter((b) => b.key === "overdue" || b.key === "today" || b.key === "tomorrow" || b.key === "week")
    .flatMap((b) => b.items);

  function renderItem(item: AgendaItem) {
    const style = DOMAIN_STYLES[item.domain];
    const dateLabel =
      item.date === today
        ? item.time
          ? formatTime(item.time)
          : "today"
        : item.date
          ? `${formatShort(item.date)}${item.time ? ` · ${formatTime(item.time)}` : ""}`
          : "";
    return (
      <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2.5 py-1.5">
        {item.completable ? (
          <button
            onClick={() => complete(item)}
            aria-label={`Mark "${item.title}" done`}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-ink/25 bg-surface transition-colors hover:border-accent hover:bg-accent-soft"
          />
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{item.title}</span>
          <span className="block truncate text-[11px] text-muted">
            <span className={style.text}>{style.label}</span>
            {item.subtitle ? ` · ${item.subtitle}` : ""}
          </span>
        </span>
        {dateLabel ? <span className="shrink-0 text-[11px] tabular-nums text-muted">{dateLabel}</span> : null}
        {item.date ? (
          <button
            onClick={() =>
              downloadICS(`vela-${item.title.slice(0, 24).replace(/\s+/g, "-")}`, agendaToCal([item]))
            }
            aria-label={`Add "${item.title}" to calendar`}
            title="Add to calendar (with a reminder)"
            className="shrink-0 text-muted/70 hover:text-accent"
          >
            📅
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-accent" aria-hidden />
      <SectionTitle
        right={
          dueSoonForCal.length ? (
            <button
              onClick={() => downloadICS("vela-agenda", agendaToCal(dueSoonForCal))}
              className="text-xs font-medium text-accent hover:underline"
              title="Add this week's items to your calendar, each with a reminder"
            >
              📅 Sync week
            </button>
          ) : undefined
        }
      >
        Everything
      </SectionTitle>
      <p className={`-mt-1 mb-2 text-xs font-medium ${agenda.dueNow ? "text-ink" : "text-meals-bright"}`}>
        {digest}
      </p>

      {agenda.buckets.length === 0 ? (
        <p className="rounded-xl bg-paper px-3 py-4 text-center text-sm text-muted">
          Nothing on your plate yet. Add a task with the ＋ button, and it&apos;ll show up here.
        </p>
      ) : (
        <div className="space-y-3">
          {primary.map((bucket) => (
            <div key={bucket.key}>
              <p className={`mb-0.5 text-[11px] font-semibold uppercase tracking-wider ${BUCKET_TINT[bucket.key] ?? "text-muted"}`}>
                {bucket.label} · {bucket.items.length}
              </p>
              <ul className="divide-y divide-line/60">{bucket.items.map(renderItem)}</ul>
            </div>
          ))}

          {laterCount > 0 ? (
            showLater ? (
              laterBuckets.map((bucket) => (
                <div key={bucket.key}>
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {bucket.label} · {bucket.items.length}
                  </p>
                  <ul className="divide-y divide-line/60">{bucket.items.map(renderItem)}</ul>
                </div>
              ))
            ) : (
              <button
                onClick={() => setShowLater(true)}
                className="w-full rounded-xl border border-dashed border-line py-2 text-xs text-muted hover:border-ink/25 hover:text-ink"
              >
                Show this week &amp; later ({laterCount})
              </button>
            )
          ) : null}
        </div>
      )}
    </Card>
  );
}
