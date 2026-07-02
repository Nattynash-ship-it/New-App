import type { HubState } from "./store/hub";
import type { ISODate, TimelineEntry } from "./types";

/**
 * Smart aggregation for the Daily Compass: merges meetings, academic
 * deadlines, family activities, planned meals, and quick-add events for a
 * given day into one chronologically sorted timeline.
 */
export function selectTimeline(s: HubState, date: ISODate): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const m of s.meetings.filter((m) => m.date === date)) {
    entries.push({
      id: m.id,
      domain: "work",
      title: m.title,
      subtitle: `${m.durationMin} min meeting`,
      time: m.time,
    });
  }

  for (const a of s.assignments.filter((a) => a.dueDate === date && !a.done)) {
    const course = s.courses.find((c) => c.id === a.courseId);
    entries.push({
      id: a.id,
      domain: "school",
      title: a.title,
      subtitle: course ? `Due · ${course.code}` : "Due today",
      time: a.dueTime,
    });
  }

  for (const act of s.activities.filter((a) => a.date === date)) {
    const kid = s.kids.find((k) => k.id === act.kidId);
    entries.push({
      id: act.id,
      domain: "family",
      title: act.title,
      subtitle: kid ? kid.name : "Family",
      time: act.time,
    });
  }

  for (const meal of s.plannedMeals.filter((m) => m.date === date)) {
    entries.push({
      id: meal.id,
      domain: "meals",
      title: meal.title,
      subtitle: meal.slot.charAt(0).toUpperCase() + meal.slot.slice(1),
      time: meal.slot === "breakfast" ? "08:00" : meal.slot === "lunch" ? "12:00" : "18:30",
    });
  }

  for (const ev of s.events.filter((e) => e.date === date)) {
    entries.push({ id: ev.id, domain: ev.domain, title: ev.title, time: ev.time });
  }

  return entries.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
}

export function courseProgress(course: { units: { topics: { completed: boolean }[] }[] }): {
  done: number;
  total: number;
  pct: number;
} {
  let done = 0;
  let total = 0;
  for (const u of course.units) {
    for (const t of u.topics) {
      total += 1;
      if (t.completed) done += 1;
    }
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
