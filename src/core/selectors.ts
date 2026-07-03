import { addDays, daysUntil, formatTime, todayISO } from "./dates";
import type { HubState } from "./store/hub";
import type { DomainSummary, ISODate, RadarEntry, TimelineEntry } from "./types";

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
      badge: act.category === "appointment" ? "appt" : undefined,
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

/**
 * The "keep me updated" radar: everything coming in the next `days` days
 * (starting tomorrow — today lives on the timeline), sorted chronologically.
 * Kid activities, doctor appointments, assignment deadlines, meetings, and
 * quick-add events all land here.
 */
export function selectUpcoming(s: HubState, days = 7): RadarEntry[] {
  const from = addDays(todayISO(), 1);
  const to = addDays(todayISO(), days);
  const inWindow = (d: ISODate) => d >= from && d <= to;
  const entries: RadarEntry[] = [];

  for (const act of s.activities.filter((a) => inWindow(a.date))) {
    const kid = s.kids.find((k) => k.id === act.kidId);
    entries.push({
      id: act.id,
      date: act.date,
      domain: "family",
      title: act.title,
      subtitle: kid ? kid.name : "Family",
      time: act.time,
      badge: act.category === "appointment" ? "appt" : act.category === "school" ? "school" : undefined,
      note: act.prepNote,
    });
  }

  for (const a of s.assignments.filter((a) => !a.done && inWindow(a.dueDate))) {
    const course = s.courses.find((c) => c.id === a.courseId);
    entries.push({
      id: a.id,
      date: a.dueDate,
      domain: "school",
      title: a.title,
      subtitle: course?.code ?? "Assignment",
      time: a.dueTime,
      badge: "due",
    });
  }

  for (const m of s.meetings.filter((m) => inWindow(m.date))) {
    entries.push({
      id: m.id,
      date: m.date,
      domain: "work",
      title: m.title,
      subtitle: `${m.durationMin} min`,
      time: m.time,
    });
  }

  for (const ev of s.events.filter((e) => inWindow(e.date))) {
    entries.push({ id: ev.id, date: ev.date, domain: ev.domain, title: ev.title, time: ev.time });
  }

  return entries.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99"),
  );
}

/** One-line live summaries per life area for the Compass overview strip. */
export function selectDomainSummaries(s: HubState): DomainSummary[] {
  const today = todayISO();

  // Work: meetings today + open tasks
  const meetingsToday = s.meetings.filter((m) => m.date === today);
  const openTasks = s.projects.reduce((n, p) => n + p.tasks.filter((t) => !t.done).length, 0);
  const nextMeeting = meetingsToday
    .filter((m) => m.time >= new Date().toTimeString().slice(0, 5))
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  // School: nearest deadline + overall progress
  const nextDue = s.assignments
    .filter((a) => !a.done && a.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  let topicsDone = 0;
  let topicsTotal = 0;
  for (const c of s.courses) {
    const p = courseProgress(c);
    topicsDone += p.done;
    topicsTotal += p.total;
  }

  // Meals: tonight's dinner
  const dinner = s.plannedMeals.find((m) => m.date === today && m.slot === "dinner");

  // Fitness: sessions in the last 7 days
  const weekAgo = addDays(today, -6);
  const sessions = s.workoutLogs.filter((l) => l.date >= weekAgo && l.date <= today).length;

  // Family: next kid item (today or later)
  const nextFamily = [...s.activities]
    .filter((a) => a.date >= today)
    .sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")))[0];
  const nextFamilyKid = s.kids.find((k) => k.id === nextFamily?.kidId);
  const totalPoints = s.kids.reduce((n, k) => n + k.points, 0);

  const dueLabel = (d: ISODate) => {
    const n = daysUntil(d);
    return n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n}d`;
  };

  return [
    {
      domain: "work",
      headline: nextMeeting
        ? `${formatTime(nextMeeting.time)} · ${nextMeeting.title}`
        : `${meetingsToday.length} meeting${meetingsToday.length === 1 ? "" : "s"} today`,
      detail: `${openTasks} open task${openTasks === 1 ? "" : "s"}`,
      href: "/work",
    },
    {
      domain: "school",
      headline: nextDue ? `${nextDue.title}` : "No deadlines",
      detail: nextDue
        ? `due ${dueLabel(nextDue.dueDate)} · ${topicsDone}/${topicsTotal} topics`
        : `${topicsDone}/${topicsTotal} topics logged`,
      href: "/school",
    },
    {
      domain: "meals",
      headline: dinner ? dinner.title : "Dinner unplanned",
      detail: dinner ? "tonight" : "tap to plan",
      href: "/meals",
    },
    {
      domain: "fitness",
      headline: `${sessions} session${sessions === 1 ? "" : "s"} this week`,
      detail: sessions === 0 ? "time to move" : "keep the streak",
      href: "/fitness",
    },
    {
      domain: "family",
      headline: nextFamily
        ? `${nextFamilyKid?.name ?? "Family"} · ${nextFamily.title}`
        : "Nothing scheduled",
      detail: nextFamily
        ? `${dueLabel(nextFamily.date)}${nextFamily.time ? ` · ${formatTime(nextFamily.time)}` : ""}`
        : `${totalPoints} pts banked`,
      href: "/family",
    },
  ];
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
