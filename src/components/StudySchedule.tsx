"use client";

import { useState } from "react";
import { Card, EmptyState, SectionTitle } from "./ui";
import { formatTime } from "@/core/dates";
import { useHub } from "@/core/store/hub";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Recurring weekly study blocks. Shows on the daily timeline and (read-only-ish)
 * on the Home page so "when am I studying?" is answerable at a glance. Every
 * course is selectable when adding a block.
 */
export function StudySchedule() {
  const studyBlocks = useHub((s) => s.studyBlocks);
  const courses = useHub((s) => s.courses);
  const addStudyBlock = useHub((s) => s.addStudyBlock);
  const removeStudyBlock = useHub((s) => s.removeStudyBlock);

  const [day, setDay] = useState(1);
  const [time, setTime] = useState("20:00");
  const [courseId, setCourseId] = useState<string>("");

  const sorted = [...studyBlocks].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time),
  );

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">shows on your daily timeline</span>}>
        Study schedule
      </SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState>Block study time — deciding when to study is half the battle.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {sorted.map((b) => {
            const course = courses.find((c) => c.id === b.courseId);
            return (
              <li
                key={b.id}
                className="group flex items-center justify-between gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-xs"
              >
                <span>
                  <span className="font-semibold">{DAY_NAMES[b.dayOfWeek]}</span>{" "}
                  <span className="text-muted">
                    {formatTime(b.time)} · {b.durationMin}m
                  </span>{" "}
                  {course?.name ?? "Focus session"}
                </span>
                <button
                  onClick={() => removeStudyBlock(b.id)}
                  className="text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                  aria-label="Remove study block"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addStudyBlock({ courseId: courseId || undefined, dayOfWeek: day, time, durationMin: 60 });
        }}
      >
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="input !w-auto !py-1.5 text-xs"
          aria-label="Day"
        >
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="input !w-auto !py-1.5 text-xs"
          aria-label="Time"
        />
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="input !w-auto min-w-[150px] flex-1 !py-1.5 text-xs"
          aria-label="Course"
        >
          <option value="">Any course · focus session</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.code} · ` : ""}
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ghost !px-3 !py-1.5 text-xs">
          Add block
        </button>
      </form>
    </Card>
  );
}
