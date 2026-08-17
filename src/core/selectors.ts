import { addDays, daysUntil, formatTime, fromISODate, todayISO } from "./dates";
import { RECIPE_LIBRARY, STAPLES, type LibraryRecipe } from "./data/recipeLibrary";
import type { HubState } from "./store/hub";
import type { CourseTopic, Domain, DomainSummary, EnergyLevel, ISODate, RadarEntry, TimelineEntry } from "./types";

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

// ---------------------------------------------------------------------------
// Time-block calendar — a day laid out on an hour grid
// ---------------------------------------------------------------------------

export interface DayBlock {
  id: string;
  domain: Domain;
  title: string;
  subtitle?: string;
  startMin: number;
  endMin: number;
  /** True for one-off scheduled items that can be deleted straight from the
   * calendar (meetings, events, meals, activities). Assignments and recurring
   * study blocks are managed in their own sections, so they're left in place. */
  removable: boolean;
  /** Custom colour swatch id (events only) — overrides the domain colour. */
  color?: string;
}

export interface DaySchedule {
  timed: DayBlock[];
  allDay: Array<{ id: string; domain: Domain; title: string }>;
}

function hmToMin(t?: string): number | null {
  if (!t) return null;
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? "0");
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/**
 * Everything happening on `date`, split into timed blocks (positioned on the
 * hour grid, with a start + end) and all-day items. Meetings and study blocks
 * carry real durations; other items get sensible default lengths.
 */
export function selectDayBlocks(s: HubState, date: ISODate): DaySchedule {
  const timed: DayBlock[] = [];
  const allDay: DaySchedule["allDay"] = [];

  const add = (
    id: string,
    domain: Domain,
    title: string,
    start: number | null,
    dur: number,
    subtitle?: string,
    removable = true,
    color?: string,
  ) => {
    if (start == null) allDay.push({ id, domain, title });
    else timed.push({ id, domain, title, subtitle, startMin: start, endMin: start + dur, removable, color });
  };

  for (const m of s.meetings.filter((m) => m.date === date)) {
    add(m.id, "work", m.title, hmToMin(m.time), Math.max(15, m.durationMin || 30), `${m.durationMin} min`);
  }
  for (const a of s.assignments.filter((a) => a.dueDate === date && !a.done)) {
    const course = s.courses.find((c) => c.id === a.courseId);
    add(a.id, "school", a.title, hmToMin(a.dueTime), 30, course ? `Due · ${course.code}` : "Due", false);
  }
  for (const act of s.activities.filter((a) => a.date === date)) {
    const kid = s.kids.find((k) => k.id === act.kidId);
    add(act.id, "family", act.title, hmToMin(act.time), 60, kid?.name ?? "Family");
  }
  const mealTimes: Record<string, [number, number]> = {
    breakfast: [480, 30],
    lunch: [720, 45],
    dinner: [1110, 45],
  };
  for (const meal of s.plannedMeals.filter((m) => m.date === date)) {
    const [start, dur] = mealTimes[meal.slot] ?? [720, 45];
    add(meal.id, "meals", meal.title, start, dur, meal.slot);
  }
  for (const ev of s.events.filter((e) => e.date === date)) {
    const start = hmToMin(ev.time);
    const end = hmToMin(ev.endTime);
    const dur = start != null && end != null && end > start ? end - start : 45;
    const subtitle =
      start != null && end != null && end > start ? `until ${formatTime(ev.endTime!)}` : undefined;
    add(ev.id, ev.domain, ev.title, start, dur, subtitle, true, ev.color);
  }
  const weekday = fromISODate(date).getDay();
  for (const block of s.studyBlocks.filter((b) => b.dayOfWeek === weekday)) {
    const course = s.courses.find((c) => c.id === block.courseId);
    add(block.id, "school", `Study · ${course?.name ?? "Focus"}`, hmToMin(block.time), block.durationMin, "study block", false);
  }

  timed.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  return { timed, allDay };
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

export function courseProgress(course: {
  completed?: boolean;
  units: { topics: { completed: boolean }[] }[];
}): {
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
  // A course passed already (e.g. from a transcript) reads as fully done even
  // when no topics were logged for it.
  if (course.completed) return { done: total, total, pct: 100 };
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
  // Passed courses (e.g. from a transcript) add to earned credits; failed ones
  // earn nothing and don't count as in-progress either (they need a retake).
  const completedFromCourses = s.courses.reduce((n, c) => n + (c.completed ? c.credits : 0), 0);
  const inProgress = s.courses.reduce(
    (n, c) => n + (c.completed || c.outcome === "failed" ? 0 : c.credits),
    0,
  );
  const completed = completedCredits + completedFromCourses;
  return {
    programName,
    completed,
    inProgress,
    total: totalCredits,
    pct: totalCredits === 0 ? 0 : Math.min(100, Math.round((completed / totalCredits) * 100)),
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

/** Longest run of consecutive days anywhere in the history. */
export function habitBestStreak(history: ISODate[]): number {
  const days = [...new Set(history)].sort();
  let best = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of days) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
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
  "You don't have to do it all today.",
  "Done is kinder than perfect.",
  "The load is lighter when it's written down.",
  "You've handled every hard day so far.",
  "Start where you are — that's allowed.",
  "Rest counts as progress too.",
  "You're allowed to take up space today.",
  "Your pace is the right pace.",
  "Tiny steps still move the boat.",
  "Nothing on this list defines you.",
  "You are more than your to-do list.",
  "One kind thing for yourself today.",
  "It's okay if today is just maintenance.",
  "Steady beats frantic, every time.",
  "You showed up — that's the hard part.",
  "Half-done still counts as started.",
  "Let good enough be good enough today.",
  "Breathe. The day will wait for you.",
  "You are carrying a lot, and doing it well.",
  "Choose the next right thing, not every thing.",
  "Momentum starts with one small yes.",
  "Future you will thank present you.",
  "Nobody is keeping score but you.",
  "You can start over at any hour.",
  "Slow progress is still the right direction.",
  "Your effort matters even when it's invisible.",
  "Give yourself the grace you'd give a friend.",
  "You've earned the space to breathe.",
  "Trust the plan you made when you were calm.",
  "Today only asks for today's share.",
];

/** Warm lines for the moment something is finished or cleared. */
const CELEBRATIONS = [
  "Everything's done — take the win. ✦",
  "Clear list. Go enjoy the rest of it.",
  "That's the whole plan, finished.",
  "All wrapped up — you earned the quiet.",
  "Nothing left today. Beautifully done.",
  "You cleared it. Rest is the reward.",
];

/** Stable pick from a list for a given seed (same seed → same line). */
function pick(list: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return list[hash % list.length]!;
}

/**
 * Deterministic encouragement (stable through the day, rotates daily). Pass a
 * distinct `slot` per surface so two cards on screen never show the same line.
 */
export function encouragementForToday(slot = ""): string {
  return pick(ENCOURAGEMENTS, todayISO() + slot);
}

/** A congratulation line for a finished list — rotates daily per surface. */
export function celebrationForToday(slot = ""): string {
  return pick(CELEBRATIONS, todayISO() + slot);
}

// ---------------------------------------------------------------------------
// Kids' weekly meals — calorie totals
// ---------------------------------------------------------------------------

export interface KidWeekCalories {
  /** Calories per weekday, index 0 = Monday … 6 = Sunday. */
  perDay: number[];
  total: number;
  /** Average over the days that actually have any meals planned. */
  avgPlannedDay: number;
}

export function kidWeekCalories(s: HubState, kidId: string): KidWeekCalories {
  const perDay = Array.from({ length: 7 }, () => 0);
  for (const m of s.kidMeals) {
    if (m.kidId === kidId && m.day >= 0 && m.day < 7) perDay[m.day]! += m.calories;
  }
  const total = perDay.reduce((n, c) => n + c, 0);
  const plannedDays = perDay.filter((c) => c > 0).length;
  return { perDay, total, avgPlannedDay: plannedDays ? Math.round(total / plannedDays) : 0 };
}

// ---------------------------------------------------------------------------
// Energy-aware daily plan — "here's today, scaled to how you feel"
// ---------------------------------------------------------------------------

export interface PlanItem {
  id: string;
  domain: Domain;
  title: string;
  time?: string;
  /** Short reason chip, e.g. "overdue", "meeting", "focus", "habit". */
  tag: string;
  /** Commitments are fixed (meetings, deadlines); flexible items flex out. */
  fixed: boolean;
}

export interface DailyPlan {
  items: PlanItem[];
  /** How many flexible items were left off today's plate given the capacity. */
  deferred: number;
  /** How many items you took off today's plan yourself (the × button). */
  dismissed: number;
  capacity: number;
  message: string;
}

const ENERGY_CAPACITY: Record<EnergyLevel, number> = { low: 3, steady: 5, high: 7 };
const ENERGY_MESSAGE: Record<EnergyLevel, string> = {
  low: "Low-energy day — trimmed to the essentials. Be gentle with yourself.",
  steady: "A steady day — here's a realistic plan, nothing over the top.",
  high: "High energy — a fuller plan to make the most of it.",
};

export const ENERGY_META: Record<EnergyLevel, { label: string; icon: string }> = {
  low: { label: "Low", icon: "🌙" },
  steady: { label: "Steady", icon: "🌤" },
  high: { label: "High", icon: "☀️" },
};

/**
 * Build a realistic plan for today, scaled to self-reported energy. Fixed
 * commitments (meetings, appointments, deadlines) always show; flexible work
 * (open tasks, remaining habits) fills the rest of the capacity, and anything
 * beyond it is reported as "deferred" rather than silently dropped — the whole
 * point is to reduce the sense of an infinite to-do list on a hard day.
 */
export function todaysPlan(s: HubState, energy: EnergyLevel): DailyPlan {
  const today = todayISO();
  const capacity = ENERGY_CAPACITY[energy];

  const fixed: PlanItem[] = [];

  for (const a of s.assignments.filter((a) => !a.done && a.dueDate < today)) {
    fixed.push({ id: a.id, domain: "school", title: a.title, time: a.dueTime, tag: "overdue", fixed: true });
  }
  for (const a of s.assignments.filter((a) => !a.done && a.dueDate === today)) {
    fixed.push({ id: a.id, domain: "school", title: a.title, time: a.dueTime, tag: "due today", fixed: true });
  }
  for (const m of s.meetings.filter((m) => m.date === today)) {
    fixed.push({ id: m.id, domain: "work", title: m.title, time: m.time, tag: "meeting", fixed: true });
  }
  for (const act of s.activities.filter((a) => a.date === today)) {
    fixed.push({
      id: act.id,
      domain: "family",
      title: act.title,
      time: act.time,
      tag: act.category === "appointment" ? "appointment" : "family",
      fixed: true,
    });
  }

  const flexible: PlanItem[] = [];
  for (const p of s.projects) {
    for (const t of p.tasks.filter((t) => !t.done)) {
      flexible.push({ id: t.id, domain: "work", title: t.title, tag: "focus", fixed: false });
    }
  }
  for (const h of s.habits.filter((h) => !habitDoneToday(h.history))) {
    flexible.push({ id: h.id, domain: "fitness", title: h.name, tag: "habit", fixed: false });
  }

  // Anything taken off today's plan with × drops out here. Nothing is deleted —
  // the meeting/assignment/task/habit still lives in its own section.
  const dismissed = new Set(s.planDismissed?.[today] ?? []);
  const keptFixed = fixed.filter((i) => !dismissed.has(i.id));
  const keptFlexible = flexible.filter((i) => !dismissed.has(i.id));

  keptFixed.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  const slots = Math.max(0, capacity - keptFixed.length);
  const chosenFlexible = keptFlexible.slice(0, slots);
  const deferred = keptFlexible.length - chosenFlexible.length;

  return {
    items: [...keptFixed, ...chosenFlexible],
    deferred,
    dismissed: dismissed.size,
    capacity,
    message: ENERGY_MESSAGE[energy],
  };
}

// ---------------------------------------------------------------------------
// Weekly Life Balance — a gentle scorecard across the life areas
// ---------------------------------------------------------------------------

export interface BalanceArea {
  key: "family" | "school" | "work" | "health" | "mind";
  label: string;
  icon: string;
  /** 0–100 "how much you've tended this area this week". */
  score: number;
  /** The real numbers behind the score, so it never feels like magic. */
  detail: string;
  href: string;
}

export interface WeeklyBalance {
  areas: BalanceArea[];
  overall: number;
  /** The lowest-scoring area — what a gentle nudge should point at. */
  quietest: BalanceArea;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * A weekly balance view across motherhood, school, work, health, and mind.
 * Each score reflects concrete, dated activity from the last 7 days (workouts
 * logged, topics finished, check-ins, chores, meetings) — the detail line
 * always shows the real numbers so the ring is transparent, not a black box.
 */
export function weeklyBalance(s: HubState): WeeklyBalance {
  const today = todayISO();
  const weekAgo = addDays(today, -6);
  const inWeek = (d: ISODate) => d >= weekAgo && d <= today;

  // Family — chores completed + kid activities this week
  const choresDone = s.ledger.filter((t) => t.delta > 0 && inWeek(t.createdAt.slice(0, 10))).length;
  const activitiesThisWeek = s.activities.filter((a) => inWeek(a.date)).length;
  const family: BalanceArea = {
    key: "family",
    label: "Family",
    icon: "🏠",
    score: clampPct((choresDone + activitiesThisWeek) * 15),
    detail: `${choresDone} chore${choresDone === 1 ? "" : "s"} · ${activitiesThisWeek} activit${activitiesThisWeek === 1 ? "y" : "ies"}`,
    href: "/family",
  };

  // School — topics finished this week, dinged for overdue work
  let topicsThisWeek = 0;
  for (const c of s.courses) {
    for (const u of c.units) {
      for (const t of u.topics) {
        if (t.completed && t.completedAt && inWeek(t.completedAt.slice(0, 10))) topicsThisWeek += 1;
      }
    }
  }
  const overdue = s.assignments.filter((a) => !a.done && a.dueDate < today).length;
  const school: BalanceArea = {
    key: "school",
    label: "School",
    icon: "🎓",
    score: clampPct(topicsThisWeek * 25 - overdue * 15),
    detail: `${topicsThisWeek} topic${topicsThisWeek === 1 ? "" : "s"}${overdue ? ` · ${overdue} overdue` : ""}`,
    href: "/school",
  };

  // Work — meetings this week + whether today's top-3 ritual is set
  const meetingsThisWeek = s.meetings.filter((m) => inWeek(m.date)).length;
  const focusSet = s.focus.date === today && s.focus.taskIds.length > 0;
  const openTasks = s.projects.reduce((n, p) => n + p.tasks.filter((t) => !t.done).length, 0);
  const work: BalanceArea = {
    key: "work",
    label: "Work",
    icon: "💼",
    score: clampPct(meetingsThisWeek * 20 + (focusSet ? 30 : 0)),
    detail: `${meetingsThisWeek} meeting${meetingsThisWeek === 1 ? "" : "s"} · ${openTasks} open`,
    href: "/work",
  };

  // Health — sessions vs target, blended with habit consistency
  const sessions = s.workoutLogs.filter((l) => inWeek(l.date)).length;
  const target = Math.max(1, s.weeklySessionTarget);
  const movePct = (sessions / target) * 100;
  const habitHits = s.habits.reduce((n, h) => n + h.history.filter((d) => inWeek(d)).length, 0);
  const habitPossible = Math.max(1, s.habits.length * 7);
  const habitPct = (habitHits / habitPossible) * 100;
  const health: BalanceArea = {
    key: "health",
    label: "Health",
    icon: "💪",
    score: clampPct((movePct + habitPct) / 2),
    detail: `${sessions}/${target} sessions`,
    href: "/fitness",
  };

  // Mind — days with a mood check-in this week
  const checkinDays = new Set(s.checkIns.filter((c) => inWeek(c.date)).map((c) => c.date)).size;
  const mind: BalanceArea = {
    key: "mind",
    label: "Mind",
    icon: "🧘",
    score: clampPct((checkinDays / 7) * 100),
    detail: `checked in ${checkinDays}/7 days`,
    href: "/",
  };

  const areas = [family, school, work, health, mind];
  const overall = clampPct(areas.reduce((n, a) => n + a.score, 0) / areas.length);
  const quietest = areas.reduce((lo, a) => (a.score < lo.score ? a : lo), areas[0]!);

  return { areas, overall, quietest };
}

const BALANCE_NUDGE: Record<BalanceArea["key"], string> = {
  family: "Home's been quiet — a quick chore or a bit of family time keeps it humming.",
  school: "School's been light this week — one topic or a short study block moves the needle.",
  work: "Not much logged at work — setting today's top 3 is a small refocus.",
  health: "Your body's asking for movement — even a 20-minute session counts.",
  mind: "You haven't checked in much — take 20 seconds for a mood check-in.",
};

export function balanceNudge(area: BalanceArea): string {
  return BALANCE_NUDGE[area.key];
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
// Weight-loss accountability
// ---------------------------------------------------------------------------

export interface WeightStats {
  unit: string;
  /** Most recent reading, or null if nothing logged yet. */
  latest: number | null;
  /** First reading (the starting point), or null. */
  start: number | null;
  goal: number | null;
  /** latest − start (negative = lost weight). null until ≥1 entry. */
  changeFromStart: number | null;
  /** latest − goal (positive = still to lose). null without both. */
  toGoal: number | null;
  /** 0–100: how far from start → goal the latest reading is. null if N/A. */
  goalPct: number | null;
  entryCount: number;
}

/** Body-weight progress: start, latest, goal, and how far along. Entries are
 *  assumed date-sorted ascending (the store keeps them that way). */
export function weightStats(s: HubState): WeightStats {
  const log = s.weightLog;
  const latest = log.length ? log[log.length - 1]!.weight : null;
  const start = log.length ? log[0]!.weight : null;
  const goal = s.weightGoal;
  const changeFromStart = latest !== null && start !== null ? Math.round((latest - start) * 10) / 10 : null;
  const toGoal = latest !== null && goal !== null ? Math.round((latest - goal) * 10) / 10 : null;

  let goalPct: number | null = null;
  if (latest !== null && start !== null && goal !== null && start !== goal) {
    const raw = ((start - latest) / (start - goal)) * 100;
    goalPct = Math.max(0, Math.min(100, Math.round(raw)));
  }

  return {
    unit: s.weightUnit,
    latest,
    start,
    goal,
    changeFromStart,
    toGoal,
    goalPct,
    entryCount: log.length,
  };
}

// ---------------------------------------------------------------------------
// Food / calorie counting
// ---------------------------------------------------------------------------

export interface FoodDay {
  entries: HubState["foodLog"];
  calories: number;
  protein: number;
  calorieGoal: number;
  proteinGoal: number;
  /** calorieGoal − calories (negative = over budget). */
  caloriesLeft: number;
  /** proteinGoal − protein (negative = goal met/exceeded). */
  proteinLeft: number;
}

/** Everything logged for a day plus totals against the calorie & protein goals. */
export function foodDay(s: HubState, date: ISODate = todayISO()): FoodDay {
  const entries = s.foodLog.filter((f) => f.date === date);
  const calories = entries.reduce((sum, f) => sum + f.calories, 0);
  const protein = entries.reduce((sum, f) => sum + (f.protein ?? 0), 0);
  return {
    entries,
    calories,
    protein,
    calorieGoal: s.calorieGoal,
    proteinGoal: s.proteinGoal,
    caloriesLeft: s.calorieGoal - calories,
    proteinLeft: s.proteinGoal - protein,
  };
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
 * A YouTube search link for how to make a dish. A search (not a fixed video id)
 * keeps the link fresh and always finds a current how-to.
 */
export function recipeVideoUrl(title: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} recipe`)}`;
}

/**
 * For wellness habits, a YouTube search that actually helps you do the habit —
 * e.g. a "Meditate" habit links to guided meditations. Returns null for habits
 * with no obvious video (so we don't show an irrelevant link).
 */
export function habitVideoUrl(name: string): { url: string; label: string } | null {
  const n = name.toLowerCase();
  const rules: Array<[RegExp, string, string]> = [
    [/medit|mindful|calm|breath/, "guided meditation", "guided"],
    [/yoga/, "yoga for beginners", "follow along"],
    [/stretch|mobility/, "stretching routine", "follow along"],
    [/workout|exercise|gym|hiit|strength/, "home workout follow along", "follow along"],
    [/run|jog/, "beginner running guide", "watch"],
    [/walk/, "indoor walking workout", "follow along"],
    [/journal|gratitude/, "journaling prompts", "ideas"],
  ];
  for (const [re, q, label] of rules) {
    if (re.test(n)) {
      return { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, label };
    }
  }
  return null;
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
