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

export interface WorkProject {
  id: Id;
  name: string;
  /** e.g. "Digital document tracking", "International policy correspondence" */
  category: string;
  status: ProjectStatus;
  tasks: WorkTask[];
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
}

// ---------------------------------------------------------------------------
// School Hub (self-paced CS degree)
// ---------------------------------------------------------------------------

export interface CourseTopic {
  id: Id;
  name: string; // e.g. "Graph Theory"
  completed: boolean;
  completedAt?: ISODateTime;
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

export type DeliveryService = "whole_foods" | "aldi";

// ---------------------------------------------------------------------------
// Fitness & Wellness
// ---------------------------------------------------------------------------

export interface RoutineExercise {
  id: Id;
  name: string; // e.g. "Russian Deadlift"
  target: string; // e.g. "3 × 12 @ moderate" — kept as prose to minimize entry
}

export interface Routine {
  id: Id;
  name: string; // "Lagree Pilates", "Glute Training", "Active Recovery"
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
}

export interface Chore {
  id: Id;
  title: string;
  points: number;
  kidId?: Id; // undefined = anyone can claim
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
}

/** At-a-glance summary of one life area, shown on the Compass overview. */
export interface DomainSummary {
  domain: Domain;
  headline: string;
  detail: string;
  href: string;
}
