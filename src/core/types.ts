/**
 * Core domain types for the Life Management Hub.
 *
 * This module is platform-agnostic (no DOM / Next.js imports) so the entire
 * domain layer can be shared verbatim with a future React Native app.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ISO date string, e.g. "2026-07-02" (local calendar date, no time). */
export type ISODate = string;
/** ISO datetime string, e.g. "2026-07-02T14:00:00.000Z". */
export type ISODateTime = string;
/** 24h time string, e.g. "14:00". */
export type TimeHHMM = string;

export type Id = string;

export type Domain = "compass" | "work" | "school" | "meals" | "fitness" | "family";

// ---------------------------------------------------------------------------
// Daily Compass (mental health & overview)
// ---------------------------------------------------------------------------

export type Mood = 1 | 2 | 3 | 4 | 5;
export type CheckInPeriod = "morning" | "evening";

export interface CheckIn {
  id: Id;
  date: ISODate;
  period: CheckInPeriod;
  mood: Mood;
  /** Optional one-line journal entry — deliberately frictionless. */
  note: string;
  /** Morning: intention for the day. Evening: one gratitude. */
  prompt: string;
  createdAt: ISODateTime;
}

/** A generic scheduled event captured via natural-language quick add. */
export interface ScheduledEvent {
  id: Id;
  title: string;
  date: ISODate;
  time?: TimeHHMM;
  domain: Domain;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Work Hub
// ---------------------------------------------------------------------------

export type ProjectStatus = "active" | "waiting" | "blocked" | "done";

export interface WorkTask {
  id: Id;
  title: string;
  done: boolean;
  dueDate?: ISODate;
}

/** Project planning: a dated milestone on the project roadmap. */
export interface Milestone {
  id: Id;
  title: string;
  targetDate?: ISODate;
  done: boolean;
}

export interface WorkProject {
  id: Id;
  name: string;
  /** e.g. "Digital document tracking", "International policy correspondence" */
  category: string;
  status: ProjectStatus;
  tasks: WorkTask[];
  milestones: Milestone[];
  /** Correspondence / document reference numbers being tracked. */
  trackingRefs: string[];
  notes: string;
}

export interface Meeting {
  id: Id;
  title: string;
  date: ISODate;
  time: TimeHHMM;
  durationMin: number;
  location?: string;
  projectId?: Id;
  /** Video-call URL (Zoom/Meet/Teams) — renders a one-tap Join button. */
  link?: string;
  agenda?: string;
}

// ---------------------------------------------------------------------------
// School Hub (self-paced CS degree)
// ---------------------------------------------------------------------------

export interface CourseTopic {
  id: Id;
  name: string; // e.g. "Graph Theory"
  completed: boolean;
  completedAt?: ISODateTime;
  /** Spaced-repetition: when this topic was last reviewed. */
  lastReviewedAt?: ISODateTime;
}

/** Recurring weekly study block — evidence-backed time blocking. */
export interface StudyBlock {
  id: Id;
  courseId?: Id;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  time: TimeHHMM;
  durationMin: number;
}

/** Graduation tracker for the self-paced degree. */
export interface DegreePlan {
  programName: string;
  totalCredits: number;
  /** Credits from courses already passed (before the ones tracked here). */
  completedCredits: number;
  targetGraduation?: ISODate;
}

export interface CourseUnit {
  id: Id;
  name: string; // e.g. "Unit 4"
  topics: CourseTopic[];
}

export interface Course {
  id: Id;
  code: string; // e.g. "MATH 232"
  name: string; // e.g. "Discrete Mathematics"
  credits: number;
  units: CourseUnit[]; // supports multi-unit courses (7-unit Discrete Math)
  targetDate?: ISODate;
  /** Passed already (e.g. from a transcript). Counts toward earned credits;
   *  in-progress courses (false/undefined) get a checkbox to tick when done. */
  completed?: boolean;
  completedAt?: ISODateTime;
}

export interface Assignment {
  id: Id;
  courseId?: Id;
  title: string;
  dueDate: ISODate;
  dueTime?: TimeHHMM;
  done: boolean;
}

// ---------------------------------------------------------------------------
// Nutrition & Grocery
// ---------------------------------------------------------------------------

export type PantryCategory = "produce" | "protein" | "grains" | "pantry" | "frozen" | "spices";

export interface PantryItem {
  id: Id;
  name: string;
  category: PantryCategory;
  /** Checked = "I currently have this" — feeds the Reverse Recipe Engine. */
  onHand: boolean;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
}

export interface Recipe {
  id: Id;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  calories: number;
  volumeScore: "high" | "medium" | "low"; // high-volume/low-calorie bias
  vegan: boolean;
  source: "ai" | "local" | "user";
  createdAt: ISODateTime;
}

export type MealSlot = "breakfast" | "lunch" | "dinner";

export interface PlannedMeal {
  id: Id;
  date: ISODate;
  slot: MealSlot;
  title: string;
  recipeId?: Id;
}

export interface GroceryItem {
  id: Id;
  name: string;
  quantity: string;
  category: PantryCategory;
  checked: boolean;
}

export type DeliveryService = "whole_foods" | "aldi" | "instacart";

/** Per-service delivery webhook URLs the user configures (Connections). */
export type GroceryConnections = Partial<Record<DeliveryService, string>>;

// ---------------------------------------------------------------------------
// Fitness & Wellness
// ---------------------------------------------------------------------------

export type FitnessGoal = "strength" | "sculpt" | "conditioning" | "mobility" | "habit";

/** At-home equipment. Drives which library workouts are shown as "doable". */
export type Equipment =
  | "rower"
  | "bike"
  | "dumbbells"
  | "kettlebell"
  | "jump_rope"
  | "medicine_ball"
  | "bands"
  | "bodyweight";

export interface RoutineExercise {
  id: Id;
  name: string; // e.g. "Russian Deadlift"
  target: string; // e.g. "3 × 12 @ moderate" — kept as prose to minimize entry
}

export interface Routine {
  id: Id;
  name: string; // "Strength & Glutes", "Cardio Conditioning", "Active Recovery"
  focus: string;
  exercises: RoutineExercise[];
}

export interface WorkoutLog {
  id: Id;
  routineId: Id;
  date: ISODate;
  /** 1–5 perceived effort. Single-tap logging, no data-entry burden. */
  effort: 1 | 2 | 3 | 4 | 5;
  note: string;
}

/** Daily habit with one-tap check-ins and streak history. */
export interface Habit {
  id: Id;
  name: string;
  /** Emoji glyph shown in the streak ring. */
  icon: string;
  /** ISO dates the habit was completed. Streak is derived from this. */
  history: ISODate[];
}

/** Cups of water logged per day, keyed by ISO date. */
export type WaterLog = Record<ISODate, number>;

/** Self-reported energy/capacity for a day — drives how full the plan gets. */
export type EnergyLevel = "low" | "steady" | "high";
export type EnergyLog = Record<ISODate, EnergyLevel>;

// ---------------------------------------------------------------------------
// Family & Gamified Economy
// ---------------------------------------------------------------------------

export interface Kid {
  id: Id;
  name: string;
  color: string; // tag color for the calendar
  points: number;
}

export type ActivityCategory = "activity" | "appointment" | "school";

export interface FamilyActivity {
  id: Id;
  kidId?: Id; // undefined = whole family
  title: string;
  date: ISODate;
  time?: TimeHHMM;
  recurring?: "weekly";
  /** Doctor/dentist visits get "appointment"; school events get "school". */
  category?: ActivityCategory;
  /** Prep note, e.g. "Bring insurance card + vaccination record". */
  prepNote?: string;
}

export interface Chore {
  id: Id;
  title: string;
  points: number;
  kidId?: Id; // undefined = anyone can claim
}

/** A kid's planned meal for a weekday slot (weekly template, not date-bound). */
export interface KidMeal {
  id: Id;
  kidId: Id;
  /** 0 = Monday … 6 = Sunday. */
  day: number;
  slot: MealSlot;
  title: string;
  calories: number;
}

export interface StoreReward {
  id: Id;
  title: string;
  cost: number;
}

export interface PointTransaction {
  id: Id;
  kidId: Id;
  delta: number; // + earned, - spent
  reason: string;
  createdAt: ISODateTime;
  /** Set for chore earnings — lets us enforce one completion per chore per day. */
  choreId?: Id;
}

// ---------------------------------------------------------------------------
// Attachments (upload a PDF / image to any section)
// ---------------------------------------------------------------------------

/** What a file is attached to. "general" is the standalone documents vault. */
export type AttachmentOwner = "course" | "unit" | "project" | "general";

/**
 * File metadata. The bytes live in on-device blob storage (IndexedDB on web,
 * a filesystem adapter on native) keyed by `id`; only this lightweight record
 * is kept in the store so state stays small, serializable, and portable.
 */
export interface Attachment {
  id: Id;
  ownerType: AttachmentOwner;
  ownerId: Id;
  name: string;
  mime: string;
  /** Bytes, for a human-readable size label. */
  size: number;
  addedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// General to-do list
// ---------------------------------------------------------------------------

export type Urgency = "high" | "medium" | "low";

/** A free-standing to-do item with an urgency level (not tied to a module). */
export interface Todo {
  id: Id;
  title: string;
  urgency: Urgency;
  done: boolean;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Notes & Journal
// ---------------------------------------------------------------------------

/** A free-form note or journal entry — the household's shared brain. */
export interface Note {
  id: Id;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Natural-language quick add
// ---------------------------------------------------------------------------

export type ParsedIntentKind =
  | "meeting"
  | "assignment"
  | "family_activity"
  | "meal"
  | "workout"
  | "event";

export interface ParsedIntent {
  kind: ParsedIntentKind;
  title: string;
  date: ISODate;
  time?: TimeHHMM;
  /** 0–1: how confident the parser is. Low confidence can defer to the AI route. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Timeline aggregation (Daily Compass)
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  id: Id;
  domain: Domain;
  title: string;
  subtitle?: string;
  time?: TimeHHMM; // undefined = all-day; sorted last
  /** Extra emphasis chip, e.g. "appointment" for doctor visits. */
  badge?: string;
}

/** A dated entry in the week-ahead radar. */
export interface RadarEntry extends TimelineEntry {
  date: ISODate;
  /** Prep note carried from the underlying activity, if any. */
  note?: string;
}

/** At-a-glance summary of one life area, shown on the Compass overview. */
export interface DomainSummary {
  domain: Domain;
  headline: string;
  detail: string;
  href: string;
}
