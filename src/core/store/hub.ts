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
import {
  seedActivities,
  seedAssignments,
  seedChores,
  seedCourses,
  seedKids,
  seedMeetings,
  seedEquipment,
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
  Equipment,
  FamilyActivity,
  FitnessGoal,
  GroceryItem,
  Habit,
  Kid,
  MealSlot,
  Meeting,
  Mood,
  PantryCategory,
  PantryItem,
  ParsedIntent,
  PlannedMeal,
  PointTransaction,
  Recipe,
  Routine,
  RoutineExercise,
  ScheduledEvent,
  StoreReward,
  StudyBlock,
  WaterLog,
  WorkoutLog,
  WorkProject,
} from "../types";

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
  // Attachments (files uploaded to any section)
  attachments: Attachment[];
  // Wellness
  habits: Habit[];
  water: WaterLog;
  waterGoal: number;
  // Meals
  preferredStore: DeliveryService;
  // Work planning
  focus: { date: string; taskIds: string[] };
  // Family
  kids: Kid[];
  activities: FamilyActivity[];
  chores: Chore[];
  rewards: StoreReward[];
  ledger: PointTransaction[];

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
  removeProject: (id: string) => void;
  toggleWorkTask: (projectId: string, taskId: string) => void;
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
  addCourse: (code: string, name: string, credits: number) => void;
  removeCourse: (id: string) => void;
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
  removeGroceryItem: (id: string) => void;
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

  // --- Attachments ---
  /** Record uploaded-file metadata (bytes are stored on-device separately). */
  addAttachment: (att: Attachment) => void;
  removeAttachment: (id: string) => void;

  // --- Wellness actions ---
  toggleHabitToday: (id: string) => void;
  addHabit: (name: string, icon: string) => void;
  removeHabit: (id: string) => void;
  logWater: (delta: number) => void;
  setWaterGoal: (n: number) => void;

  // --- Meals settings ---
  setPreferredStore: (s: DeliveryService) => void;

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
    attachments: [] as Attachment[],
    habits: seedHabits(),
    water: {} as WaterLog,
    waterGoal: 8,
    preferredStore: "whole_foods" as DeliveryService,
    focus: { date: todayISO(), taskIds: [] as string[] },
    kids: seedKids(),
    activities: seedActivities(),
    chores: seedChores(),
    rewards: seedRewards(),
    ledger: [] as PointTransaction[],
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
        // Strip the action functions — keep only the data slices.
        const {
          profile, checkIns, events, projects, meetings, courses, assignments,
          studyBlocks, degreePlan, pantry, recipes, plannedMeals, groceryList,
          routines, workoutLogs, fitnessGoals, weeklySessionTarget, equipment,
          attachments, habits, water,
          waterGoal, preferredStore, focus, kids, activities, chores, rewards, ledger,
        } = s;
        return JSON.stringify(
          {
            _vela: 1,
            exportedAt: nowISO(),
            data: {
              profile, checkIns, events, projects, meetings, courses, assignments,
              studyBlocks, degreePlan, pantry, recipes, plannedMeals, groceryList,
              routines, workoutLogs, fitnessGoals, weeklySessionTarget, habits, water,
              waterGoal, preferredStore, focus, kids, activities, chores, rewards, ledger,
            },
          },
          null,
          2,
        );
      },
      importData: (json) => {
        try {
          const parsed = JSON.parse(json) as { _vela?: number; data?: Partial<HubState> };
          if (!parsed.data || typeof parsed.data !== "object") return false;
          set(() => parsed.data as Partial<HubState>);
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
        const { kind, title, date, time } = intent;
        if (kind === "meeting") {
          get().addMeeting({ title, date, time: time ?? "09:00", durationMin: 30 });
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
                domain: kind === "workout" ? "fitness" : "compass",
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
      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          meetings: s.meetings.map((m) => (m.projectId === id ? { ...m, projectId: undefined } : m)),
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
                  tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
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
      addCourse: (code, name, credits) =>
        set((s) => ({
          courses: [
            ...s.courses,
            {
              id: newId("course"),
              code,
              name,
              credits,
              units: [{ id: newId("unit"), name: "Unit 1", topics: [] }],
            },
          ],
        })),
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
      removeGroceryItem: (id) =>
        set((s) => ({ groceryList: s.groceryList.filter((g) => g.id !== id) })),
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

      // --- Attachments ---
      addAttachment: (att) => set((s) => ({ attachments: [att, ...s.attachments] })),
      removeAttachment: (id) =>
        set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) })),

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

      setPreferredStore: (preferredStore) => set({ preferredStore }),

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
        })),
      addChore: (title, points) =>
        set((s) => ({ chores: [...s.chores, { id: newId("chore"), title, points }] })),
      removeChore: (id) => set((s) => ({ chores: s.chores.filter((c) => c.id !== id) })),
      addReward: (title, cost) =>
        set((s) => ({ rewards: [...s.rewards, { id: newId("rw"), title, cost }] })),
      removeReward: (id) => set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) })),
      completeChore: (choreId, kidId) => {
        const chore = get().chores.find((c) => c.id === choreId);
        if (!chore) return;
        set((s) => ({
          kids: s.kids.map((k) => (k.id === kidId ? { ...k, points: k.points + chore.points } : k)),
          ledger: [
            { id: newId("tx"), kidId, delta: chore.points, reason: chore.title, createdAt: nowISO() },
            ...s.ledger,
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
          fitnessGoals: p.fitnessGoals ?? current.fitnessGoals,
          weeklySessionTarget: p.weeklySessionTarget ?? current.weeklySessionTarget,
          equipment: p.equipment ?? current.equipment,
          attachments: p.attachments ?? current.attachments,
        };
      },
    },
  ),
);

/** SSR/hydration guard — components render skeletons until the store rehydrates. */
export { useHydrated } from "./useHydrated";
