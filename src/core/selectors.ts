import { addDays, daysUntil, formatTime, fromISODate, todayISO } from "./dates";
import { RECIPE_LIBRARY, STAPLES, type LibraryRecipe } from "./data/recipeLibrary";
import type { HubState } from "./store/hub";
import type { CourseTopic, DomainSummary, ISODate, RadarEntry, TimelineEntry } from "./types";

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

  // Recurring study blocks land on their weekday
  const weekday = fromISODate(date).getDay();
  for (const block of s.studyBlocks.filter((b) => b.dayOfWeek === weekday)) {
    const course = s.courses.find((c) => c.id === block.courseId);
    entries.push({
      id: block.id,
      domain: "school",
      title: `Study · ${course?.name ?? "Focus session"}`,
      subtitle: `${block.durationMin} min block`,
      time: block.time,
    });
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

// ---------------------------------------------------------------------------
// School: graduation tracker + spaced-repetition review queue
// ---------------------------------------------------------------------------

export interface GraduationStats {
  programName: string;
  completed: number;
  inProgress: number;
  total: number;
  pct: number;
  targetGraduation?: ISODate;
}

export function graduationStats(s: HubState): GraduationStats {
  const { programName, totalCredits, completedCredits, targetGraduation } = s.degreePlan;
  const inProgress = s.courses.reduce((n, c) => n + c.credits, 0);
  return {
    programName,
    completed: completedCredits,
    inProgress,
    total: totalCredits,
    pct: totalCredits === 0 ? 0 : Math.round((completedCredits / totalCredits) * 100),
    targetGraduation,
  };
}

export interface ReviewItem {
  courseId: string;
  unitId: string;
  topicId: string;
  topicName: string;
  courseCode: string;
  daysSince: number;
}

/**
 * Spaced-repetition queue: completed topics come due for a quick review at
 * expanding intervals (3/7/14/30 days since last touch). Evidence-backed
 * active recall, kept deliberately lightweight.
 */
export function selectReviewQueue(s: HubState, limit = 5): ReviewItem[] {
  const now = Date.now();
  const items: ReviewItem[] = [];
  for (const course of s.courses) {
    for (const unit of course.units) {
      for (const topic of unit.topics) {
        if (!topic.completed) continue;
        const last = topic.lastReviewedAt ?? topic.completedAt;
        if (!last) continue;
        const daysSince = Math.floor((now - new Date(last).getTime()) / 86_400_000);
        if (daysSince >= 3 && daysSince <= 60) {
          items.push({
            courseId: course.id,
            unitId: unit.id,
            topicId: topic.id,
            topicName: topic.name,
            courseCode: course.code,
            daysSince,
          });
        }
      }
    }
  }
  return items.sort((a, b) => b.daysSince - a.daysSince).slice(0, limit);
}

export function topicIsReviewable(t: CourseTopic): boolean {
  return t.completed && Boolean(t.completedAt ?? t.lastReviewedAt);
}

// ---------------------------------------------------------------------------
// Wellness: habit streaks, water, encouragement
// ---------------------------------------------------------------------------

/** Current consecutive-day streak ending today (or yesterday, if today's
 *  not done yet — the streak is still alive). */
export function habitStreak(history: ISODate[]): number {
  const set = new Set(history);
  let cursor = todayISO();
  if (!set.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function habitDoneToday(history: ISODate[]): boolean {
  return history.includes(todayISO());
}

export function waterToday(s: HubState): number {
  return s.water[todayISO()] ?? 0;
}

const ENCOURAGEMENTS = [
  "You've got this, one step at a time.",
  "Progress, not perfection — every small step counts.",
  "Small steps, steady sail.",
  "One thing at a time is enough.",
  "You're doing better than you think.",
  "Be kind to yourself today.",
];

/** Deterministic per-day encouragement (stable through the day, rotates daily). */
export function encouragementForToday(): string {
  const iso = todayISO();
  let hash = 0;
  for (let i = 0; i < iso.length; i++) hash = (hash * 31 + iso.charCodeAt(i)) >>> 0;
  return ENCOURAGEMENTS[hash % ENCOURAGEMENTS.length]!;
}

// ---------------------------------------------------------------------------
// Fitness: weekly target + streak
// ---------------------------------------------------------------------------

export interface FitnessWeek {
  sessionsThisWeek: number;
  target: number;
  /** Consecutive prior weeks (before this one) that hit the target. */
  weekStreak: number;
}

function startOfWeek(date: ISODate): ISODate {
  const d = fromISODate(date);
  const diff = (d.getDay() + 6) % 7; // Monday-based
  return addDays(date, -diff);
}

export function fitnessWeek(s: HubState): FitnessWeek {
  const target = s.weeklySessionTarget;
  const thisWeekStart = startOfWeek(todayISO());
  const countWeek = (weekStart: ISODate) => {
    const weekEnd = addDays(weekStart, 6);
    return s.workoutLogs.filter((l) => l.date >= weekStart && l.date <= weekEnd).length;
  };

  let weekStreak = 0;
  for (let i = 1; i <= 12; i++) {
    if (countWeek(addDays(thisWeekStart, -7 * i)) >= target) weekStreak += 1;
    else break;
  }

  return { sessionsThisWeek: countWeek(thisWeekStart), target, weekStreak };
}

// ---------------------------------------------------------------------------
// Meals: SuperCook-style "cook with what you have"
// ---------------------------------------------------------------------------

export interface RecipeMatch {
  recipe: LibraryRecipe;
  missing: string[];
  ready: boolean;
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/s$/, "");
}

/**
 * Matches the built-in recipe library against what's actually available:
 * pantry items marked on-hand plus everything on the grocery list (it's
 * incoming). Returns ready-now first, then near-misses (≤2 missing).
 */
export function matchRecipes(s: HubState): RecipeMatch[] {
  const available = new Set<string>([
    ...STAPLES.map(normalize),
    ...s.pantry.filter((p) => p.onHand).map((p) => normalize(p.name)),
    ...s.groceryList.map((g) => normalize(g.name)),
  ]);

  const results: RecipeMatch[] = [];
  for (const recipe of RECIPE_LIBRARY) {
    const missing = recipe.ingredients.filter((ing) => !available.has(normalize(ing)));
    if (missing.length <= 2) {
      results.push({ recipe, missing, ready: missing.length === 0 });
    }
  }

  return results.sort(
    (a, b) => a.missing.length - b.missing.length || a.recipe.calories - b.recipe.calories,
  );
}
