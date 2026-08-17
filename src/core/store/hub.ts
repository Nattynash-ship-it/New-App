/**
 * Central persisted store for the Life Management Hub.
 *
 * Zustand runs unchanged in React Native — porting this store only requires
 * swapping the persistence adapter (localStorage → AsyncStorage). All actions
 * are pure state transitions; no DOM APIs.
 *
 * The persisted shape mirrors the proposed Supabase schema
 * (see supabase/schema.sql) so a later sync layer is a straight mapping.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { addDays, nowISO, todayISO } from "../dates";
import { DEFAULT_WEATHER_LOCATION, type WeatherLocation } from "../weather";
import { RECIPE_LIBRARY } from "../data/recipeLibrary";
import {
  seedActivities,
  seedAssignments,
  seedChores,
  seedCourses,
  seedKids,
  seedMeetings,
  seedEquipment,
  seedKidMeals,
  seedNotes,
  seedTodos,
  seedPantry,
  seedPlannedMeals,
  seedHabits,
  seedRewards,
  seedRoutines,
  seedStudyBlocks,
  seedWorkProjects,
} from "../data/seed";
import type {
  Assignment,
  Attachment,
  AttachmentOwner,
  CheckIn,
  CheckInPeriod,
  Chore,
  Course,
  DegreePlan,
  DeliveryService,
  Domain,
  EnergyLevel,
  EnergyLog,
  Equipment,
  GroceryConnections,
  FamilyActivity,
  FitnessGoal,
  GroceryItem,
  Habit,
  Kid,
  KidMeal,
  MealSlot,
  Meeting,
  Mood,
  Note,
  PantryCategory,
  PantryItem,
  ParsedIntent,
  PlannedMeal,
  PointTransaction,
  ProjectStatus,
  Recipe,
  Routine,
  RoutineExercise,
  ScheduledEvent,
  StoreReward,
  StudyBlock,
  TaskStatus,
  Todo,
  Urgency,
  WaterLog,
  WeightEntry,
  WeightUnit,
  FoodEntry,
  WorkoutLog,
  WorkProject,
} from "../types";
import { PROGRAM_DEFAULT_START, programCellKey, programCurrentWeek } from "../fitness/program";

/** Canonical list of persisted data slices (no action fns). Export/import walk
 *  this so a newly-added slice can never be silently dropped from a backup. */
export const DATA_KEYS = [
  "profile", "checkIns", "events", "projects", "meetings", "courses", "assignments",
  "studyBlocks", "degreePlan", "pantry", "recipes", "plannedMeals", "groceryList",
  "routines", "workoutLogs", "fitnessGoals", "weeklySessionTarget", "equipment",
  "weightLog", "weightGoal", "weightUnit", "programProgress", "programWeek", "programStartDate",
  "foodLog", "calorieGoal", "proteinGoal",
  "attachments", "notes", "todos", "habits", "water", "waterGoal", "energyLog",
  "preferredStore", "groceryConnections", "focus", "kids", "activities", "chores",
  "rewards", "ledger", "kidMeals", "schoolPortalUrl", "alertsEnabled", "weatherLocation",
] as const;

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export interface Profile {
  name: string;
  /** Set true once the user has completed first-run setup. */
  onboarded: boolean;
  /** Role tags shown as a chip, e.g. ["Mom", "Student", "Professional"]. */
  roles: string[];
}

export interface HubState {
  // Identity
  profile: Profile;
  // Daily Compass
  checkIns: CheckIn[];
  events: ScheduledEvent[];
  // Work
  projects: WorkProject[];
  meetings: Meeting[];
  // School
  courses: Course[];
  assignments: Assignment[];
  studyBlocks: StudyBlock[];
  degreePlan: DegreePlan;
  // Meals
  pantry: PantryItem[];
  recipes: Recipe[];
  plannedMeals: PlannedMeal[];
  groceryList: GroceryItem[];
  // Fitness
  routines: Routine[];
  workoutLogs: WorkoutLog[];
  fitnessGoals: FitnessGoal[];
  weeklySessionTarget: number;
  equipment: Equipment[];
  /** Weight-loss accountability: body-weight entries, goal, and unit. */
  weightLog: WeightEntry[];
  weightGoal: number | null;
  weightUnit: WeightUnit;
  /** 8-Week Glute program: which cells (week,day) are done + the active week. */
  programProgress: Record<string, boolean>;
  programWeek: number;
  /** Calendar anchor: the Sunday Week 1 begins on (weeks run Sun → Sat). */
  programStartDate: string;
  /** Food/calorie counting: logged foods + daily calorie & protein targets. */
  foodLog: FoodEntry[];
  calorieGoal: number;
  proteinGoal: number;
  // Attachments (files uploaded to any section)
  attachments: Attachment[];
  // Notes & journal
  notes: Note[];
  // General to-do list
  todos: Todo[];
  // Wellness
  habits: Habit[];
  water: WaterLog;
  waterGoal: number;
  /** Self-reported daily energy — powers the capacity-scaled "today's plan". */
  energyLog: EnergyLog;
  // Meals
  preferredStore: DeliveryService;
  /** User-configured delivery webhook URLs per store (Connections). */
  groceryConnections: GroceryConnections;
  // Work planning
  focus: { date: string; taskIds: string[] };
  // Family
  kids: Kid[];
  activities: FamilyActivity[];
  chores: Chore[];
  rewards: StoreReward[];
  ledger: PointTransaction[];
  /** Weekly meal template per kid (breakfast/lunch/dinner + calories). */
  kidMeals: KidMeal[];
  // School / inbox
  /** One-tap link to your school portal (e.g. https://my.wgu.edu). */
  schoolPortalUrl: string;
  /** Opted into browser alerts (e.g. for new school email once connected). */
  alertsEnabled: boolean;
  /** Where the weather card looks — zip + resolved coordinates. */
  weatherLocation: WeatherLocation;

  // --- Profile / settings actions ---
  setProfileName: (name: string) => void;
  setRoles: (roles: string[]) => void;
  completeOnboarding: (name: string) => void;
  /** Serialize the whole hub to a JSON string for backup. */
  exportData: () => string;
  /** Replace the hub from a previously exported JSON string. Returns success. */
  importData: (json: string) => boolean;
  /** Wipe everything back to fresh seed data (keeps you onboarded). */
  resetToSeed: () => void;

  // --- Compass actions ---
  addCheckIn: (period: CheckInPeriod, mood: Mood, note: string, prompt: string) => void;
  /** Route a parsed natural-language intent into the right module. */
  addFromIntent: (intent: ParsedIntent) => void;
  /** Remove any removable timeline entry (meeting, event, meal, activity) by id. */
  removeTimelineItem: (id: string) => void;

  // --- Work actions ---
  addProject: (name: string, category: string) => void;
  /** Create a fully-specified project in one step (professional add flow). */
  createProject: (input: {
    name: string;
    category: string;
    status?: ProjectStatus;
    notes?: string;
    trackingRefs?: string[];
    firstMilestone?: { title: string; targetDate?: string };
  }) => void;
  removeProject: (id: string) => void;
  setProjectStatus: (id: string, status: ProjectStatus) => void;
  toggleWorkTask: (projectId: string, taskId: string) => void;
  setWorkTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => void;
  addWorkTask: (projectId: string, title: string) => void;
  removeWorkTask: (projectId: string, taskId: string) => void;
  addMeeting: (m: Omit<Meeting, "id">) => void;
  removeMeeting: (id: string) => void;
  addMilestone: (projectId: string, title: string, targetDate?: string) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  removeMilestone: (projectId: string, milestoneId: string) => void;
  /** Sunsama-style daily ritual: pick up to 3 tasks to focus on today. */
  toggleFocusTask: (taskId: string) => void;

  // --- School actions ---
  addCourse: (code: string, name: string, credits: number, completed?: boolean) => void;
  removeCourse: (id: string) => void;
  toggleCourseCompleted: (id: string) => void;
  /** Record how a class ended: passed (earns credits), failed (doesn't —
   *  retake), or back to in progress. */
  setCourseOutcome: (id: string, outcome: "passed" | "failed" | "in_progress") => void;
  /** Add a batch of template courses as in-progress, skipping ones already on
   *  the plan (matched by name). Returns how many were newly added. */
  loadDegreeTemplate: (
    programName: string,
    totalCredits: number,
    courses: Array<{ code: string; name: string; credits: number }>,
  ) => number;
  addUnit: (courseId: string, name: string) => void;
  addTopic: (courseId: string, unitId: string, name: string) => void;
  toggleTopic: (courseId: string, unitId: string, topicId: string) => void;
  toggleAssignment: (id: string) => void;
  addAssignment: (a: Omit<Assignment, "id" | "done">) => void;
  removeAssignment: (id: string) => void;
  addStudyBlock: (b: Omit<StudyBlock, "id">) => void;
  removeStudyBlock: (id: string) => void;
  updateDegreePlan: (patch: Partial<DegreePlan>) => void;
  /** Spaced repetition: stamp a completed topic as freshly reviewed. */
  reviewTopic: (courseId: string, unitId: string, topicId: string) => void;

  // --- Meals actions ---
  togglePantryItem: (id: string) => void;
  addPantryItem: (name: string, category: PantryCategory) => void;
  removePantryItem: (id: string) => void;
  addGroceryItem: (name: string) => void;
  /** Add several items at once, skipping ones already listed or on hand.
   *  Returns how many were newly added. */
  addGroceryItems: (names: string[]) => number;
  removeGroceryItem: (id: string) => void;
  restoreGroceryItem: (item: GroceryItem) => void;
  saveRecipe: (r: Recipe) => void;
  planMeal: (date: string, slot: MealSlot, title: string, recipeId?: string) => void;
  removePlannedMeal: (id: string) => void;
  generateGroceryList: () => void;
  toggleGroceryItem: (id: string) => void;
  clearGroceryList: () => void;

  // --- Fitness actions ---
  logWorkout: (routineId: string, effort: WorkoutLog["effort"], note: string) => void;
  removeWorkoutLog: (id: string) => void;
  addRoutine: (name: string, focus: string) => void;
  /** Add a fully-formed routine (e.g. from the workout library) in one step. */
  addRoutineWithExercises: (
    name: string,
    focus: string,
    exercises: Array<{ name: string; target: string }>,
  ) => void;
  removeRoutine: (id: string) => void;
  addExercise: (routineId: string, name: string, target: string) => void;
  removeExercise: (routineId: string, exerciseId: string) => void;
  setFitnessGoals: (goals: FitnessGoal[]) => void;
  setWeeklySessionTarget: (n: number) => void;
  setEquipment: (equipment: Equipment[]) => void;

  // --- Weight tracking ---
  /** Record a weight for a day (one entry per day — a repeat replaces it). */
  logWeight: (weight: number, date?: string) => void;
  removeWeightEntry: (id: string) => void;
  setWeightGoal: (goal: number | null) => void;
  /** Switch lb/kg, converting every stored weight + goal to the new unit. */
  setWeightUnit: (unit: WeightUnit) => void;

  // --- 8-Week Glute program ---
  /** Check/uncheck a training day for a given program week. */
  toggleProgramDay: (week: number, day: number) => void;
  /** Set the active program week (1–8). */
  setProgramWeek: (week: number) => void;
  /** Restart the program on a new start date: clears all completion and jumps
   *  the active week to wherever `today` falls in the fresh schedule. */
  restartProgram: (startDate: string) => void;

  // --- Food / calorie counting ---
  logFood: (name: string, calories: number, protein?: number, date?: string) => void;
  removeFoodEntry: (id: string) => void;
  setCalorieGoal: (n: number) => void;
  setProteinGoal: (n: number) => void;

  // --- Attachments ---
  /** Record uploaded-file metadata (bytes are stored on-device separately). */
  addAttachment: (att: Attachment) => void;
  removeAttachment: (id: string) => void;

  // --- Notes & journal ---
  addNote: (title: string, body: string) => void;
  updateNote: (id: string, patch: { title?: string; body?: string; tags?: string[] }) => void;
  removeNote: (id: string) => void;
  togglePinNote: (id: string) => void;

  // --- General to-do list ---
  addTodo: (
    title: string,
    urgency: Urgency,
    domain?: Domain,
    dueDate?: string,
    alert?: boolean,
  ) => void;
  setTodoDue: (id: string, dueDate?: string) => void;
  toggleTodoAlert: (id: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  setTodoUrgency: (id: string, urgency: Urgency) => void;

  // --- Wellness actions ---
  toggleHabitToday: (id: string) => void;
  addHabit: (name: string, icon: string) => void;
  removeHabit: (id: string) => void;
  logWater: (delta: number) => void;
  setWaterGoal: (n: number) => void;
  /** Set today's energy level (drives the capacity-scaled plan). */
  setEnergy: (level: EnergyLevel) => void;

  // --- Meals settings ---
  setPreferredStore: (s: DeliveryService) => void;
  /** Save (or clear, with "") a delivery service's webhook URL. */
  setGroceryConnection: (service: DeliveryService, url: string) => void;

  // --- Family actions ---
  addActivity: (a: Omit<FamilyActivity, "id">) => void;
  removeActivity: (id: string) => void;
  setActivityPrepNote: (id: string, note: string) => void;
  addKid: (name: string) => void;
  removeKid: (id: string) => void;
  addChore: (title: string, points: number) => void;
  removeChore: (id: string) => void;
  addReward: (title: string, cost: number) => void;
  removeReward: (id: string) => void;
  completeChore: (choreId: string, kidId: string) => void;
  redeemReward: (rewardId: string, kidId: string) => void;
  /** Upsert a kid's meal for a weekday slot; an empty title clears the cell. */
  setKidMeal: (kidId: string, day: number, slot: MealSlot, title: string, calories: number) => void;
  setSchoolPortalUrl: (url: string) => void;
  setAlertsEnabled: (on: boolean) => void;
  setWeatherLocation: (loc: WeatherLocation) => void;
}

function initialState() {
  const courses = seedCourses();
  return {
    profile: { name: "friend", onboarded: false, roles: ["Mom", "Student", "Professional"] } as Profile,
    checkIns: [] as CheckIn[],
    events: [] as ScheduledEvent[],
    projects: seedWorkProjects(),
    meetings: seedMeetings(),
    courses,
    assignments: seedAssignments(courses),
    studyBlocks: seedStudyBlocks(courses),
    degreePlan: {
      programName: "B.S. Computer Science",
      totalCredits: 120,
      completedCredits: 58,
      targetGraduation: addDays(todayISO(), 700),
    } as DegreePlan,
    pantry: seedPantry(),
    recipes: [] as Recipe[],
    plannedMeals: seedPlannedMeals(),
    groceryList: [] as GroceryItem[],
    routines: seedRoutines(),
    workoutLogs: [] as WorkoutLog[],
    fitnessGoals: ["sculpt", "strength"] as FitnessGoal[],
    weeklySessionTarget: 4,
    equipment: seedEquipment(),
    weightLog: [] as WeightEntry[],
    weightGoal: null as number | null,
    weightUnit: "lb" as WeightUnit,
    programProgress: {} as Record<string, boolean>,
    programWeek: programCurrentWeek(PROGRAM_DEFAULT_START),
    programStartDate: PROGRAM_DEFAULT_START,
    foodLog: [] as FoodEntry[],
    calorieGoal: 1500,
    proteinGoal: 100,
    attachments: [] as Attachment[],
    notes: seedNotes(),
    todos: seedTodos(),
    habits: seedHabits(),
    water: {} as WaterLog,
    waterGoal: 8,
    energyLog: {} as EnergyLog,
    preferredStore: "whole_foods" as DeliveryService,
    groceryConnections: {} as GroceryConnections,
    focus: { date: todayISO(), taskIds: [] as string[] },
    kids: seedKids(),
    activities: seedActivities(),
    chores: seedChores(),
    rewards: seedRewards(),
    ledger: [] as PointTransaction[],
    kidMeals: seedKidMeals(),
    schoolPortalUrl: "",
    alertsEnabled: false,
    weatherLocation: DEFAULT_WEATHER_LOCATION,
  };
}

export const useHub = create<HubState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      // --- Profile / settings ---
      setProfileName: (name) =>
        set((s) => ({ profile: { ...s.profile, name: name.trim() || s.profile.name } })),
      setRoles: (roles) =>
        set((s) => ({
          profile: { ...s.profile, roles: roles.map((r) => r.trim()).filter(Boolean).slice(0, 5) },
        })),
      completeOnboarding: (name) =>
        set((s) => ({ profile: { ...s.profile, name: name.trim() || "friend", onboarded: true } })),
      exportData: () => {
        const s = get();
        // Walk the canonical key list so every data slice is always included.
        const data: Record<string, unknown> = {};
        for (const k of DATA_KEYS) data[k] = s[k];
        return JSON.stringify({ _vela: 1, exportedAt: nowISO(), data }, null, 2);
      },
      importData: (json) => {
        try {
          const parsed = JSON.parse(json) as { _vela?: number; data?: Record<string, unknown> };
          if (parsed._vela !== 1 || !parsed.data || typeof parsed.data !== "object") return false;
          // Only accept known slices (ignore anything foreign).
          const picked: Record<string, unknown> = {};
          for (const k of DATA_KEYS) if (k in parsed.data) picked[k] = parsed.data[k];
          // Reset any slice missing from the backup to fresh defaults, then
          // apply the backup. Shallow-merge (not replace) so actions survive.
          set(() => ({ ...initialState(), ...picked }) as Partial<HubState>);
          return true;
        } catch {
          return false;
        }
      },
      resetToSeed: () =>
        set((s) => ({ ...initialState(), profile: s.profile })),

      // --- Compass ---
      addCheckIn: (period, mood, note, prompt) =>
        set((s) => ({
          checkIns: [
            ...s.checkIns.filter((c) => !(c.date === todayISO() && c.period === period)),
            {
              id: newId("ci"),
              date: todayISO(),
              period,
              mood,
              note,
              prompt,
              createdAt: nowISO(),
            },
          ],
        })),

      addFromIntent: (intent) => {
        const { kind, title, date, time, endTime, color, alert } = intent;
        // Minutes-of-day for a "HH:MM" string, or null.
        const mins = (t?: string) => {
          if (!t) return null;
          const parts = t.split(":");
          const h = Number(parts[0]);
          const m = Number(parts[1] ?? 0);
          return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
        };
        if (kind === "meeting") {
          const s = mins(time);
          const e = mins(endTime);
          const durationMin = s != null && e != null && e > s ? e - s : 30;
          get().addMeeting({ title, date, time: time ?? "09:00", durationMin });
        } else if (kind === "assignment") {
          get().addAssignment({ title, dueDate: date, dueTime: time });
        } else if (kind === "family_activity") {
          const category = /\b(dentist|doctor|pediatric|orthodont|checkup|check-up|appointment|vaccin|physical)\b/i.test(title)
            ? "appointment"
            : /\b(school|recital|assembly|conference|field trip)\b/i.test(title)
              ? "school"
              : "activity";
          get().addActivity({ title, date, time, category });
        } else if (kind === "meal") {
          get().planMeal(date, time && time >= "16:00" ? "dinner" : "lunch", title);
        } else {
          set((s) => ({
            events: [
              ...s.events,
              {
                id: newId("ev"),
                title,
                date,
                time,
                ...(endTime ? { endTime } : {}),
                domain: kind === "workout" ? "fitness" : "compass",
                ...(color ? { color } : {}),
                ...(alert ? { alert: true } : {}),
                createdAt: nowISO(),
              },
            ],
          }));
        }
      },

      removeTimelineItem: (id) =>
        set((s) => ({
          meetings: s.meetings.filter((m) => m.id !== id),
          events: s.events.filter((e) => e.id !== id),
          plannedMeals: s.plannedMeals.filter((m) => m.id !== id),
          activities: s.activities.filter((a) => a.id !== id),
        })),

      // --- Work ---
      addProject: (name, category) =>
        set((s) => ({
          projects: [
            ...s.projects,
            {
              id: newId("proj"),
              name,
              category,
              status: "active" as const,
              tasks: [],
              milestones: [],
              trackingRefs: [],
              notes: "",
            },
          ],
        })),
      createProject: (input) =>
        set((s) => ({
          projects: [
            ...s.projects,
            {
              id: newId("proj"),
              name: input.name.trim(),
              category: input.category.trim() || "General",
              status: input.status ?? ("active" as const),
              tasks: [],
              milestones: input.firstMilestone?.title.trim()
                ? [
                    {
                      id: newId("ms"),
                      title: input.firstMilestone.title.trim(),
                      targetDate: input.firstMilestone.targetDate || undefined,
                      done: false,
                    },
                  ]
                : [],
              trackingRefs: (input.trackingRefs ?? [])
                .map((r) => r.trim())
                .filter(Boolean),
              notes: input.notes?.trim() ?? "",
            },
          ],
        })),
      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          meetings: s.meetings.map((m) => (m.projectId === id ? { ...m, projectId: undefined } : m)),
        })),
      setProjectStatus: (id, status) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, status } : p)),
        })),
      removeWorkTask: (projectId, taskId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId ? p : { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) },
          ),
          focus: { ...s.focus, taskIds: s.focus.taskIds.filter((t) => t !== taskId) },
        })),
      removeMilestone: (projectId, milestoneId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : { ...p, milestones: p.milestones.filter((m) => m.id !== milestoneId) },
          ),
        })),
      toggleWorkTask: (projectId, taskId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === taskId
                      ? { ...t, done: !t.done, status: (!t.done ? "done" : "todo") as TaskStatus }
                      : t,
                  ),
                },
          ),
        })),
      setWorkTaskStatus: (projectId, taskId, status) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === taskId ? { ...t, status, done: status === "done" } : t,
                  ),
                },
          ),
        })),
      addWorkTask: (projectId, title) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : { ...p, tasks: [...p.tasks, { id: newId("task"), title, done: false }] },
          ),
        })),
      addMeeting: (m) => set((s) => ({ meetings: [...s.meetings, { ...m, id: newId("mtg") }] })),
      removeMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),
      addMilestone: (projectId, title, targetDate) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  milestones: [
                    ...p.milestones,
                    { id: newId("ms"), title, targetDate, done: false },
                  ],
                },
          ),
        })),
      toggleMilestone: (projectId, milestoneId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  milestones: p.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, done: !m.done } : m,
                  ),
                },
          ),
        })),
      toggleFocusTask: (taskId) =>
        set((s) => {
          const today = todayISO();
          const current = s.focus.date === today ? s.focus.taskIds : [];
          const next = current.includes(taskId)
            ? current.filter((id) => id !== taskId)
            : current.length >= 3
              ? current
              : [...current, taskId];
          return { focus: { date: today, taskIds: next } };
        }),

      // --- School ---
      addCourse: (code, name, credits, completed = false) =>
        set((s) => ({
          courses: [
            ...s.courses,
            {
              id: newId("course"),
              code,
              name,
              credits,
              units: [{ id: newId("unit"), name: "Unit 1", topics: [] }],
              completed,
              ...(completed ? { completedAt: nowISO(), outcome: "passed" as const } : {}),
            },
          ],
        })),
      toggleCourseCompleted: (id) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id
              ? {
                  ...c,
                  completed: !c.completed,
                  completedAt: c.completed ? undefined : nowISO(),
                  outcome: c.completed ? undefined : ("passed" as const),
                }
              : c,
          ),
        })),
      setCourseOutcome: (id, outcome) =>
        set((s) => ({
          courses: s.courses.map((c) => {
            if (c.id !== id) return c;
            if (outcome === "passed") {
              return { ...c, completed: true, completedAt: nowISO(), outcome: "passed" as const };
            }
            if (outcome === "failed") {
              return { ...c, completed: false, completedAt: undefined, outcome: "failed" as const };
            }
            return { ...c, completed: false, completedAt: undefined, outcome: undefined };
          }),
        })),
      loadDegreeTemplate: (programName, totalCredits, courses) => {
        const s = get();
        const have = new Set(s.courses.map((c) => c.name.trim().toLowerCase()));
        const fresh = courses.filter((c) => !have.has(c.name.trim().toLowerCase()));
        if (fresh.length > 0) {
          set((st) => ({
            degreePlan: { ...st.degreePlan, programName, totalCredits },
            courses: [
              ...st.courses,
              ...fresh.map((c) => ({
                id: newId("course"),
                code: c.code,
                name: c.name,
                credits: c.credits,
                units: [{ id: newId("unit"), name: "Unit 1", topics: [] }],
                completed: false,
              })),
            ],
          }));
        }
        return fresh.length;
      },
      removeCourse: (id) =>
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
          assignments: s.assignments.filter((a) => a.courseId !== id),
          studyBlocks: s.studyBlocks.filter((b) => b.courseId !== id),
        })),
      addUnit: (courseId, name) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : { ...c, units: [...c.units, { id: newId("unit"), name, topics: [] }] },
          ),
        })),
      addTopic: (courseId, unitId, name) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  units: c.units.map((u) =>
                    u.id !== unitId
                      ? u
                      : {
                          ...u,
                          topics: [...u.topics, { id: newId("topic"), name, completed: false }],
                        },
                  ),
                },
          ),
        })),
      toggleTopic: (courseId, unitId, topicId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  units: c.units.map((u) =>
                    u.id !== unitId
                      ? u
                      : {
                          ...u,
                          topics: u.topics.map((t) =>
                            t.id !== topicId
                              ? t
                              : {
                                  ...t,
                                  completed: !t.completed,
                                  completedAt: !t.completed ? nowISO() : undefined,
                                },
                          ),
                        },
                  ),
                },
          ),
        })),
      toggleAssignment: (id) =>
        set((s) => ({
          assignments: s.assignments.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
        })),
      addAssignment: (a) =>
        set((s) => ({ assignments: [...s.assignments, { ...a, id: newId("asg"), done: false }] })),
      removeAssignment: (id) =>
        set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) })),
      addStudyBlock: (b) =>
        set((s) => ({ studyBlocks: [...s.studyBlocks, { ...b, id: newId("sb") }] })),
      removeStudyBlock: (id) =>
        set((s) => ({ studyBlocks: s.studyBlocks.filter((b) => b.id !== id) })),
      updateDegreePlan: (patch) => set((s) => ({ degreePlan: { ...s.degreePlan, ...patch } })),
      reviewTopic: (courseId, unitId, topicId) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  units: c.units.map((u) =>
                    u.id !== unitId
                      ? u
                      : {
                          ...u,
                          topics: u.topics.map((t) =>
                            t.id === topicId ? { ...t, lastReviewedAt: nowISO() } : t,
                          ),
                        },
                  ),
                },
          ),
        })),

      // --- Meals ---
      togglePantryItem: (id) =>
        set((s) => ({
          pantry: s.pantry.map((p) => (p.id === id ? { ...p, onHand: !p.onHand } : p)),
        })),
      addPantryItem: (name, category) =>
        set((s) => ({
          pantry: [...s.pantry, { id: newId("pan"), name, category, onHand: true }],
        })),
      removePantryItem: (id) =>
        set((s) => ({ pantry: s.pantry.filter((p) => p.id !== id) })),
      addGroceryItem: (name) =>
        set((s) => ({
          groceryList: [
            ...s.groceryList,
            { id: newId("gro"), name, quantity: "1", category: "pantry" as const, checked: false },
          ],
        })),
      addGroceryItems: (names) => {
        const s = get();
        // Skip anything already on the list or already on hand in the pantry —
        // and de-dupe the incoming batch case-insensitively.
        const seen = new Set([
          ...s.groceryList.map((g) => g.name.toLowerCase()),
          ...s.pantry.filter((p) => p.onHand).map((p) => p.name.toLowerCase()),
        ]);
        const fresh: string[] = [];
        for (const name of names) {
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          fresh.push(name);
        }
        if (fresh.length === 0) return 0;
        set((st) => ({
          groceryList: [
            ...st.groceryList,
            ...fresh.map((name) => ({
              id: newId("gro"),
              name,
              quantity: "1",
              category: "pantry" as const,
              checked: false,
            })),
          ],
        }));
        return fresh.length;
      },
      removeGroceryItem: (id) =>
        set((s) => ({ groceryList: s.groceryList.filter((g) => g.id !== id) })),
      restoreGroceryItem: (item) =>
        set((s) =>
          s.groceryList.some((g) => g.id === item.id)
            ? s
            : { groceryList: [...s.groceryList, item] },
        ),
      saveRecipe: (r) => set((s) => ({ recipes: [r, ...s.recipes].slice(0, 30) })),
      planMeal: (date, slot, title, recipeId) =>
        set((s) => ({
          plannedMeals: [...s.plannedMeals, { id: newId("meal"), date, slot, title, recipeId }],
        })),
      removePlannedMeal: (id) =>
        set((s) => ({ plannedMeals: s.plannedMeals.filter((m) => m.id !== id) })),

      generateGroceryList: () => {
        const s = get();
        const week = new Set(
          s.plannedMeals.filter((m) => m.date >= todayISO()).map((m) => m.recipeId),
        );
        const needed = new Map<string, GroceryItem>();

        // Ingredients from planned recipes that aren't on hand
        const onHand = new Set(
          s.pantry.filter((p) => p.onHand).map((p) => p.name.toLowerCase()),
        );
        for (const recipe of s.recipes) {
          if (!week.has(recipe.id)) continue;
          for (const ing of recipe.ingredients) {
            const key = ing.name.toLowerCase();
            if (!onHand.has(key) && !needed.has(key)) {
              needed.set(key, {
                id: newId("gro"),
                name: ing.name,
                quantity: ing.quantity,
                category: "pantry",
                checked: false,
              });
            }
          }
        }
        // Built-in library recipes planned this week (their ingredients are
        // names only — quantities stay flexible, so default to "1").
        for (const recipe of RECIPE_LIBRARY) {
          if (!week.has(recipe.id)) continue;
          for (const name of recipe.ingredients) {
            const key = name.toLowerCase();
            if (!onHand.has(key) && !needed.has(key)) {
              needed.set(key, {
                id: newId("gro"),
                name,
                quantity: "1",
                category: "pantry",
                checked: false,
              });
            }
          }
        }
        // Restock anything marked not-on-hand in the pantry
        for (const item of s.pantry) {
          const key = item.name.toLowerCase();
          if (!item.onHand && !needed.has(key)) {
            needed.set(key, {
              id: newId("gro"),
              name: item.name,
              quantity: "1",
              category: item.category,
              checked: false,
            });
          }
        }
        set({ groceryList: [...needed.values()] });
      },
      toggleGroceryItem: (id) =>
        set((s) => ({
          groceryList: s.groceryList.map((g) => (g.id === id ? { ...g, checked: !g.checked } : g)),
        })),
      clearGroceryList: () => set({ groceryList: [] }),

      // --- Fitness ---
      logWorkout: (routineId, effort, note) =>
        set((s) => ({
          workoutLogs: [
            { id: newId("log"), routineId, date: todayISO(), effort, note },
            ...s.workoutLogs,
          ],
        })),
      removeWorkoutLog: (id) =>
        set((s) => ({ workoutLogs: s.workoutLogs.filter((l) => l.id !== id) })),
      addRoutine: (name, focus) =>
        set((s) => ({
          routines: [...s.routines, { id: newId("routine"), name, focus, exercises: [] }],
        })),
      addRoutineWithExercises: (name, focus, exercises) =>
        set((s) => ({
          routines: [
            ...s.routines,
            {
              id: newId("routine"),
              name,
              focus,
              exercises: exercises.map(
                (e): RoutineExercise => ({ id: newId("ex"), name: e.name, target: e.target }),
              ),
            },
          ],
        })),
      removeRoutine: (id) =>
        set((s) => ({
          routines: s.routines.filter((r) => r.id !== id),
          workoutLogs: s.workoutLogs.filter((l) => l.routineId !== id),
        })),
      addExercise: (routineId, name, target) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id !== routineId
              ? r
              : { ...r, exercises: [...r.exercises, { id: newId("ex"), name, target }] },
          ),
        })),
      removeExercise: (routineId, exerciseId) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id !== routineId
              ? r
              : { ...r, exercises: r.exercises.filter((e) => e.id !== exerciseId) },
          ),
        })),
      setFitnessGoals: (goals) => set({ fitnessGoals: goals }),
      setWeeklySessionTarget: (n) => set({ weeklySessionTarget: Math.min(7, Math.max(1, n)) }),
      setEquipment: (equipment) => set({ equipment }),

      // --- Weight tracking ---
      logWeight: (weight, date) =>
        set((s) => {
          const w = Math.round(Math.max(0, weight) * 10) / 10;
          if (!w) return s;
          const day = date ?? todayISO();
          // One entry per day — a new reading for the same day replaces it.
          const rest = s.weightLog.filter((e) => e.date !== day);
          return {
            weightLog: [...rest, { id: newId("wt"), date: day, weight: w }].sort((a, b) =>
              a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
            ),
          };
        }),
      removeWeightEntry: (id) =>
        set((s) => ({ weightLog: s.weightLog.filter((e) => e.id !== id) })),
      setWeightGoal: (goal) =>
        set({ weightGoal: goal === null ? null : Math.round(Math.max(0, goal) * 10) / 10 }),
      setWeightUnit: (unit) =>
        set((s) => {
          if (unit === s.weightUnit) return s;
          const LB_PER_KG = 2.2046226218;
          const convert = (v: number) =>
            Math.round((unit === "kg" ? v / LB_PER_KG : v * LB_PER_KG) * 10) / 10;
          return {
            weightUnit: unit,
            weightGoal: s.weightGoal === null ? null : convert(s.weightGoal),
            weightLog: s.weightLog.map((e) => ({ ...e, weight: convert(e.weight) })),
          };
        }),

      // --- 8-Week Glute program ---
      toggleProgramDay: (week, day) =>
        set((s) => {
          const key = programCellKey(week, day);
          const next = { ...s.programProgress };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { programProgress: next };
        }),
      setProgramWeek: (week) => set({ programWeek: Math.min(8, Math.max(1, Math.round(week))) }),
      restartProgram: (startDate) => {
        const clean = (startDate || "").slice(0, 10) || PROGRAM_DEFAULT_START;
        set({
          programStartDate: clean,
          programProgress: {},
          programWeek: programCurrentWeek(clean),
        });
      },

      // --- Food / calorie counting ---
      logFood: (name, calories, protein, date) =>
        set((s) => {
          const clean = name.trim();
          if (!clean) return s;
          return {
            foodLog: [
              {
                id: newId("food"),
                date: date ?? todayISO(),
                name: clean,
                calories: Math.max(0, Math.round(calories) || 0),
                ...(protein != null && protein > 0
                  ? { protein: Math.max(0, Math.round(protein)) }
                  : {}),
              },
              ...s.foodLog,
            ],
          };
        }),
      removeFoodEntry: (id) => set((s) => ({ foodLog: s.foodLog.filter((f) => f.id !== id) })),
      setCalorieGoal: (n) => set({ calorieGoal: Math.min(6000, Math.max(0, Math.round(n) || 0)) }),
      setProteinGoal: (n) => set({ proteinGoal: Math.min(400, Math.max(0, Math.round(n) || 0)) }),

      // --- Attachments ---
      addAttachment: (att) => set((s) => ({ attachments: [att, ...s.attachments] })),
      removeAttachment: (id) =>
        set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) })),

      // --- Notes & journal ---
      addNote: (title, body) =>
        set((s) => ({
          notes: [
            {
              id: newId("note"),
              title: title.trim() || "Untitled note",
              body: body.trim(),
              pinned: false,
              createdAt: nowISO(),
              updatedAt: nowISO(),
            },
            ...s.notes,
          ],
        })),
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  ...(patch.title !== undefined ? { title: patch.title } : {}),
                  ...(patch.body !== undefined ? { body: patch.body } : {}),
                  updatedAt: nowISO(),
                }
              : n,
          ),
        })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      togglePinNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
        })),

      // --- General to-do list ---
      addTodo: (title, urgency, domain, dueDate, alert) =>
        set((s) => ({
          todos: [
            {
              id: newId("todo"),
              title: title.trim(),
              urgency,
              done: false,
              createdAt: nowISO(),
              ...(domain ? { domain } : {}),
              ...(dueDate ? { dueDate } : {}),
              ...(alert ? { alert: true } : {}),
            },
            ...s.todos,
          ],
        })),
      setTodoDue: (id, dueDate) =>
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, dueDate: dueDate || undefined } : t,
          ),
        })),
      toggleTodoAlert: (id) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, alert: !t.alert } : t)),
        })),
      toggleTodo: (id) =>
        set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      removeTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      setTodoUrgency: (id, urgency) =>
        set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, urgency } : t)) })),

      // --- Wellness ---
      toggleHabitToday: (id) =>
        set((s) => {
          const today = todayISO();
          return {
            habits: s.habits.map((h) =>
              h.id !== id
                ? h
                : {
                    ...h,
                    history: h.history.includes(today)
                      ? h.history.filter((d) => d !== today)
                      : [...h.history, today],
                  },
            ),
          };
        }),
      addHabit: (name, icon) =>
        set((s) => ({
          habits: [...s.habits, { id: newId("hab"), name, icon: icon || "✦", history: [] }],
        })),
      removeHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
      logWater: (delta) =>
        set((s) => {
          const today = todayISO();
          const next = Math.max(0, (s.water[today] ?? 0) + delta);
          return { water: { ...s.water, [today]: next } };
        }),
      setWaterGoal: (n) => set({ waterGoal: Math.min(20, Math.max(1, n)) }),
      setEnergy: (level) =>
        set((s) => ({ energyLog: { ...s.energyLog, [todayISO()]: level } })),

      setPreferredStore: (preferredStore) => set({ preferredStore }),
      setGroceryConnection: (service, url) =>
        set((s) => {
          const next = { ...s.groceryConnections };
          const clean = url.trim();
          if (clean) next[service] = clean;
          else delete next[service];
          return { groceryConnections: next };
        }),

      // --- Family ---
      addActivity: (a) => set((s) => ({ activities: [...s.activities, { ...a, id: newId("act") }] })),
      removeActivity: (id) => set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),
      setActivityPrepNote: (id, note) =>
        set((s) => ({
          activities: s.activities.map((a) =>
            a.id === id ? { ...a, prepNote: note.trim() || undefined } : a,
          ),
        })),
      addKid: (name) =>
        set((s) => {
          const palette = ["#8A5FD6", "#4E74E6", "#C9702C", "#167A42", "#E25C82"];
          return {
            kids: [
              ...s.kids,
              {
                id: newId("kid"),
                name,
                color: palette[s.kids.length % palette.length] ?? "#8A5FD6",
                points: 0,
              },
            ],
          };
        }),
      removeKid: (id) =>
        set((s) => ({
          kids: s.kids.filter((k) => k.id !== id),
          activities: s.activities.filter((a) => a.kidId !== id),
          chores: s.chores.filter((c) => c.kidId !== id),
          ledger: s.ledger.filter((tx) => tx.kidId !== id),
          kidMeals: s.kidMeals.filter((m) => m.kidId !== id),
        })),
      addChore: (title, points) =>
        set((s) => ({ chores: [...s.chores, { id: newId("chore"), title, points }] })),
      removeChore: (id) => set((s) => ({ chores: s.chores.filter((c) => c.id !== id) })),
      addReward: (title, cost) =>
        set((s) => ({ rewards: [...s.rewards, { id: newId("rw"), title, cost }] })),
      removeReward: (id) => set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) })),
      completeChore: (choreId, kidId) => {
        const s = get();
        const chore = s.chores.find((c) => c.id === choreId);
        if (!chore) return;
        // One completion per chore per kid per day — no point farming.
        const today = todayISO();
        const alreadyToday = s.ledger.some(
          (t) => t.choreId === choreId && t.kidId === kidId && t.createdAt.slice(0, 10) === today,
        );
        if (alreadyToday) return;
        set((st) => ({
          kids: st.kids.map((k) => (k.id === kidId ? { ...k, points: k.points + chore.points } : k)),
          ledger: [
            { id: newId("tx"), kidId, delta: chore.points, reason: chore.title, createdAt: nowISO(), choreId },
            ...st.ledger,
          ],
        }));
      },
      redeemReward: (rewardId, kidId) => {
        const s = get();
        const reward = s.rewards.find((r) => r.id === rewardId);
        const kid = s.kids.find((k) => k.id === kidId);
        if (!reward || !kid || kid.points < reward.cost) return;
        set((st) => ({
          kids: st.kids.map((k) =>
            k.id === kidId ? { ...k, points: k.points - reward.cost } : k,
          ),
          ledger: [
            { id: newId("tx"), kidId, delta: -reward.cost, reason: `Redeemed: ${reward.title}`, createdAt: nowISO() },
            ...st.ledger,
          ],
        }));
      },
      setKidMeal: (kidId, day, slot, title, calories) =>
        set((s) => {
          const others = s.kidMeals.filter(
            (m) => !(m.kidId === kidId && m.day === day && m.slot === slot),
          );
          const clean = title.trim();
          if (!clean) return { kidMeals: others };
          return {
            kidMeals: [
              ...others,
              {
                id: newId("km"),
                kidId,
                day,
                slot,
                title: clean,
                calories: Math.max(0, Math.round(calories) || 0),
              },
            ],
          };
        }),
      setSchoolPortalUrl: (url) => set({ schoolPortalUrl: url.trim() }),
      setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
      setWeatherLocation: (weatherLocation) => set({ weatherLocation }),
    }),
    {
      name: "life-hub-v1",
      storage: createJSONStorage(() => localStorage),
      /**
       * Zustand's default rehydrate does a *shallow* top-level merge, so a
       * persisted `profile` created before a field existed (e.g. `roles`) would
       * silently override the initialised profile and drop the new field —
       * crashing any code that reads it. Deep-merge each object slice over the
       * fresh initial state so newly-added fields always have a default.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<HubState>;
        return {
          ...current,
          ...p,
          profile: { ...current.profile, ...(p.profile ?? {}) },
          degreePlan: { ...current.degreePlan, ...(p.degreePlan ?? {}) },
          focus: { ...current.focus, ...(p.focus ?? {}) },
          // Slices added after the first release — fall back to seed/default
          // when an older persisted blob doesn't carry them.
          habits: p.habits ?? current.habits,
          water: p.water ?? current.water,
          waterGoal: p.waterGoal ?? current.waterGoal,
          energyLog: p.energyLog ?? current.energyLog,
          fitnessGoals: p.fitnessGoals ?? current.fitnessGoals,
          weeklySessionTarget: p.weeklySessionTarget ?? current.weeklySessionTarget,
          equipment: p.equipment ?? current.equipment,
          weightLog: p.weightLog ?? current.weightLog,
          weightGoal: p.weightGoal ?? current.weightGoal,
          weightUnit: p.weightUnit ?? current.weightUnit,
          programProgress: p.programProgress ?? current.programProgress,
          programWeek: p.programWeek ?? current.programWeek,
          programStartDate: p.programStartDate ?? current.programStartDate,
          foodLog: p.foodLog ?? current.foodLog,
          calorieGoal: p.calorieGoal ?? current.calorieGoal,
          proteinGoal: p.proteinGoal ?? current.proteinGoal,
          attachments: p.attachments ?? current.attachments,
          notes: p.notes ?? current.notes,
          todos: p.todos ?? current.todos,
          kidMeals: p.kidMeals ?? current.kidMeals,
          groceryConnections: p.groceryConnections ?? current.groceryConnections,
        };
      },
    },
  ),
);

/** SSR/hydration guard — components render skeletons until the store rehydrates. */
export { useHydrated } from "./useHydrated";
