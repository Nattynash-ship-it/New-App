"use client";

import { useState } from "react";
import {
  Card,
  Checkbox,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Skeleton,
} from "@/components/ui";
import { daysUntil, formatFriendly, formatShort } from "@/core/dates";
import { courseProgress } from "@/core/selectors";
import { useHub, useHydrated } from "@/core/store/hub";

function AssignmentList() {
  const assignments = useHub((s) => s.assignments);
  const courses = useHub((s) => s.courses);
  const toggleAssignment = useHub((s) => s.toggleAssignment);

  const sorted = [...assignments].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate),
  );

  return (
    <Card>
      <SectionTitle>Assignment deadlines</SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState>No assignments tracked. Try “essay due Friday” on the Compass.</EmptyState>
      ) : (
        <div className="space-y-0.5">
          {sorted.map((a) => {
            const course = courses.find((c) => c.id === a.courseId);
            const d = daysUntil(a.dueDate);
            const urgency =
              a.done ? "" : d < 0 ? " · overdue" : d === 0 ? " · today" : d <= 2 ? ` · in ${d}d` : "";
            return (
              <Checkbox
                key={a.id}
                checked={a.done}
                onChange={() => toggleAssignment(a.id)}
                label={a.title}
                sub={`${course ? `${course.code} · ` : ""}${formatFriendly(a.dueDate)}${urgency}`}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CourseCard({ courseId }: { courseId: string }) {
  const course = useHub((s) => s.courses.find((c) => c.id === courseId));
  const toggleTopic = useHub((s) => s.toggleTopic);
  const [openUnit, setOpenUnit] = useState<string | null>(null);

  if (!course) return null;
  const { done, total, pct } = courseProgress(course);

  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{course.name}</h3>
          <p className="text-xs text-muted">
            {course.code} · {course.credits} credits · {course.units.length} units
            {course.targetDate ? ` · target ${formatShort(course.targetDate)}` : ""}
          </p>
        </div>
        <span className="font-display text-xl text-school">{pct}%</span>
      </div>
      <ProgressBar pct={pct} colorClass="bg-school" />
      <p className="mt-1.5 text-xs text-muted">
        {done} of {total} topics logged
      </p>

      <div className="mt-3 space-y-1.5">
        {course.units.map((unit) => {
          const unitDone = unit.topics.filter((t) => t.completed).length;
          const isOpen = openUnit === unit.id;
          return (
            <div key={unit.id} className="rounded-xl border border-line">
              <button
                onClick={() => setOpenUnit(isOpen ? null : unit.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-xs font-medium">{unit.name}</span>
                <span className="flex items-center gap-2 text-[11px] text-muted">
                  {unitDone}/{unit.topics.length}
                  <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>
                    ›
                  </span>
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-line px-2 py-1.5">
                  {unit.topics.map((t) => (
                    <Checkbox
                      key={t.id}
                      checked={t.completed}
                      onChange={() => toggleTopic(course.id, unit.id, t.id)}
                      label={t.name}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function SchoolPage() {
  const hydrated = useHydrated();
  const courseIds = useHub((s) => s.courses.map((c) => c.id));

  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="School Hub"
        title="Self-paced CS degree"
        subtitle="Log topics as you master them — units and progress track automatically."
      />
      <AssignmentList />
      <div className="grid gap-5 lg:grid-cols-2">
        {courseIds.map((id) => (
          <CourseCard key={id} courseId={id} />
        ))}
      </div>
    </div>
  );
}
