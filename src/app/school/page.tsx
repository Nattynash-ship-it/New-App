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
import { daysUntil, formatFriendly, formatShort, formatTime } from "@/core/dates";
import { courseProgress, graduationStats, selectReviewQueue } from "@/core/selectors";
import { useHub, useHydrated } from "@/core/store/hub";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function GraduationTracker() {
  const state = useHub();
  const stats = graduationStats(state);
  const afterCurrent = stats.completed + stats.inProgress;
  const pctAfter = Math.round((afterCurrent / stats.total) * 100);

  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-school" aria-hidden />
      <SectionTitle
        right={
          stats.targetGraduation ? (
            <span className="text-xs text-muted">
              target · {formatShort(stats.targetGraduation)}
            </span>
          ) : undefined
        }
      >
        Graduation tracker
      </SectionTitle>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-4xl text-school-bright">{stats.pct}%</span>
        <span className="text-sm text-muted">
          {stats.completed} of {stats.total} credits earned · {stats.programName}
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar pct={stats.pct} colorClass="bg-school" />
      </div>
      <p className="mt-2 text-xs text-muted">
        {stats.inProgress} credits in progress now — finishing them puts you at{" "}
        <span className="font-semibold text-ink">{pctAfter}%</span> of the degree.
      </p>
    </Card>
  );
}

function StudySchedule() {
  const studyBlocks = useHub((s) => s.studyBlocks);
  const courses = useHub((s) => s.courses);
  const addStudyBlock = useHub((s) => s.addStudyBlock);
  const removeStudyBlock = useHub((s) => s.removeStudyBlock);

  const [day, setDay] = useState(1);
  const [time, setTime] = useState("20:00");
  const [courseId, setCourseId] = useState<string>(courses[0]?.id ?? "");

  const sorted = [...studyBlocks].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time));

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
              <li key={b.id} className="group flex items-center justify-between gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-xs">
                <span>
                  <span className="font-semibold">{DAY_NAMES[b.dayOfWeek]}</span>{" "}
                  <span className="text-muted">{formatTime(b.time)} · {b.durationMin}m</span>{" "}
                  {course?.name ?? "Focus session"}
                </span>
                <button
                  onClick={() => removeStudyBlock(b.id)}
                  className="text-muted opacity-0 hover:text-fitness-bright group-hover:opacity-100"
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
        <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="input !w-auto !py-1.5 text-xs" aria-label="Day">
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input !w-auto !py-1.5 text-xs" aria-label="Time" />
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input !w-auto max-w-[160px] !py-1.5 text-xs" aria-label="Course">
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-ghost !px-3 !py-1.5 text-xs">
          Add block
        </button>
      </form>
    </Card>
  );
}

function ReviewQueue() {
  const state = useHub();
  const reviewTopic = useHub((s) => s.reviewTopic);
  const queue = selectReviewQueue(state);

  if (queue.length === 0) return null;

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">spaced repetition</span>}>
        Due for review
      </SectionTitle>
      <p className="mb-2 text-xs text-muted">
        A 5-minute recall pass on topics you finished a while ago locks them in.
      </p>
      <ul className="space-y-1">
        {queue.map((item) => (
          <li key={item.topicId} className="flex items-center justify-between gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-xs">
            <span>
              <span className="font-medium">{item.topicName}</span>{" "}
              <span className="text-muted">{item.courseCode} · last touched {item.daysSince}d ago</span>
            </span>
            <button
              onClick={() => reviewTopic(item.courseId, item.unitId, item.topicId)}
              className="btn-ghost shrink-0 !px-2.5 !py-1 text-xs !text-school-bright hover:!border-school"
            >
              Reviewed ✓
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

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
        <span className="font-display text-xl text-school-bright">{pct}%</span>
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
  const courseIds = useHub((s) => s.courses).map((c) => c.id);

  if (!hydrated) return <Skeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="School Hub"
        title="Self-paced CS degree"
        subtitle="Credits, deadlines, study blocks, and review — the whole degree in one place."
      />
      <GraduationTracker />
      <div className="grid gap-5 lg:grid-cols-2">
        <StudySchedule />
        <AssignmentList />
      </div>
      <ReviewQueue />
      <div className="grid gap-5 lg:grid-cols-2">
        {courseIds.map((id) => (
          <CourseCard key={id} courseId={id} />
        ))}
      </div>
    </div>
  );
}
