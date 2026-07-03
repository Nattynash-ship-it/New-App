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
  seedPantry,
  seedPlannedMeals,
  seedRewards,
  seedRoutines,
  seedStudyBlocks,
  seedWorkProjects,
} from "../data/seed";
import type {
  Assignment,
  CheckIn,
  CheckInPeriod,
  Chore,
  Course,
  DegreePlan,
  DeliveryService,
  FamilyActivity,
  FitnessGoal,
  GroceryItem,
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
  ScheduledEvent,
  StoreReward,
  StudyBlock,
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

export interface HubState {
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

  // --- Compass actions ---
  addCheckIn: (period: CheckInPeriod, mood: Mood, note: string, prompt: string) => void;
  /** Route a parsed natural-language intent into the right module. */
  addFromIntent: (intent: ParsedIntent) => void;

  // --- Work actions ---
  toggleWorkTask: (projectId: string, taskId: string) => void;
  addWorkTask: (projectId: string, title: string) => void;
  addMeeting: (m: Omit<Meeting, "id">) => void;
  removeMeeting: (id: string) => void;
  addMilestone: (projectId: string, title: string, targetDate?: string) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  /** Sunsama-style daily ritual: pick up to 3 tasks to focus on today. */
  toggleFocusTask: (taskId: string) => void;

  // --- School actions ---
  toggleTopic: (courseId: string, unitId: string, topicId: string) => void;
  toggleAssignment: (id: string) => void;
  addAssignment: (a: Omit<Assignment, "id" | "done">) => void;
  addStudyBlock: (b: Omit<StudyBlock, "id">) => void;
  removeStudyBlock: (id: string) => void;
  updateDegreePlan: (patch: Partial<DegreePlan>) => void;
  /** Spaced repetition: stamp a completed topic as freshly reviewed. */
  reviewTopic: (courseId: string, unitId: string, topicId: string) => void;

  // --- Meals actions ---
  togglePantryItem: (id: string) => void;
  addPantryItem: (name: string, category: PantryCategory) => void;
  saveRecipe: (r: Recipe) => void;
  planMeal: (date: string, slot: MealSlot, title: string, recipeId?: string) => void;
  removePlannedMeal: (id: string) => void;
  generateGroceryList: () => void;
  toggleGroceryItem: (id: string) => void;
  clearGroceryList: () => void;

  // --- Fitness actions ---
  logWorkout: (routineId: string, effort: WorkoutLog["effort"], note: string) => void;
  setFitnessGoals: (goals: FitnessGoal[]) => void;
  setWeeklySessionTarget: (n: number) => void;

  // --- Meals settings ---
  setPreferredStore: (s: DeliveryService) => void;

  // --- Family actions ---
  addActivity: (a: Omit<FamilyActivity, "id">) => void;
  removeActivity: (id: string) => void;
  setActivityPrepNote: (id: string, note: string) => void;
  completeChore: (choreId: string, kidId: string) => void;
  redeemReward: (rewardId: string, kidId: string) => void;
}

function initialState() {
  const courses = seedCourses();
  return {
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

      // --- Work ---
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
      setFitnessGoals: (goals) => set({ fitnessGoals: goals }),
      setWeeklySessionTarget: (n) => set({ weeklySessionTarget: Math.min(7, Math.max(1, n)) }),
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
    },
  ),
);

/** SSR/hydration guard — components render skeletons until the store rehydrates. */
export { useHydrated } from "./useHydrated";
