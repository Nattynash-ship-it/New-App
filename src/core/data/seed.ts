/**
 * Seed data — pre-configures the hub around the target user's real life so
 * day one requires zero setup: CS coursework (incl. a 7-unit Discrete Math
 * course with Graph Theory), professional document/policy tracking, vegan
 * high-volume meal defaults, Lagree/glute/recovery routines, and a kids'
 * points economy.
 */

import { addDays, todayISO } from "../dates";
import type {
  Assignment,
  Chore,
  Course,
  FamilyActivity,
  Habit,
  Kid,
  Meeting,
  PantryItem,
  PlannedMeal,
  Routine,
  StoreReward,
  StudyBlock,
  WorkProject,
} from "../types";

let n = 0;
const id = (prefix: string) => `${prefix}_seed_${++n}`;

export function seedWorkProjects(): WorkProject[] {
  return [
    {
      id: id("proj"),
      name: "Digital Document Tracking",
      category: "Records & Compliance",
      status: "active",
      trackingRefs: ["DOC-2026-0142", "DOC-2026-0187"],
      notes: "Migrating legacy records into the new tracking system.",
      milestones: [
        { id: id("ms"), title: "Legacy audit complete", targetDate: addDays(todayISO(), 10), done: true },
        { id: id("ms"), title: "Batch migration finished", targetDate: addDays(todayISO(), 24), done: false },
        { id: id("ms"), title: "New retention policy live", targetDate: addDays(todayISO(), 45), done: false },
      ],
      tasks: [
        { id: id("task"), title: "Audit Q2 intake log", done: true },
        { id: id("task"), title: "Reconcile missing scans (batch 14)", done: false },
        { id: id("task"), title: "Draft retention policy update", done: false, dueDate: addDays(todayISO(), 6) },
      ],
    },
    {
      id: id("proj"),
      name: "International Policy Correspondence",
      category: "Policy",
      status: "waiting",
      trackingRefs: ["INTL-88-A"],
      notes: "Awaiting counterpart response on memo v3.",
      milestones: [
        { id: id("ms"), title: "Memo v3 delivered", done: true },
        { id: id("ms"), title: "Counterpart response received", targetDate: addDays(todayISO(), 14), done: false },
        { id: id("ms"), title: "Joint briefing scheduled", targetDate: addDays(todayISO(), 30), done: false },
      ],
      tasks: [
        { id: id("task"), title: "Send memo v3 to liaison office", done: true },
        { id: id("task"), title: "Prepare briefing notes for follow-up", done: false, dueDate: addDays(todayISO(), 9) },
      ],
    },
  ];
}

export function seedMeetings(): Meeting[] {
  const today = todayISO();
  return [
    {
      id: id("mtg"),
      title: "Policy review sync",
      date: today,
      time: "10:00",
      durationMin: 30,
      link: "https://zoom.us/j/000000000",
      agenda: "Memo v3 feedback · next steps with liaison office",
    },
    { id: id("mtg"), title: "Records team standup", date: today, time: "14:30", durationMin: 15 },
    {
      id: id("mtg"),
      title: "Liaison office follow-up",
      date: addDays(today, 2),
      time: "11:00",
      durationMin: 45,
      link: "https://meet.google.com/xxx-xxxx-xxx",
    },
  ];
}

export function seedStudyBlocks(courses: Course[]): StudyBlock[] {
  const [discrete, dsa] = courses;
  return [
    { id: id("sb"), courseId: discrete?.id, dayOfWeek: 1, time: "20:00", durationMin: 60 },
    { id: id("sb"), courseId: discrete?.id, dayOfWeek: 3, time: "20:00", durationMin: 60 },
    { id: id("sb"), courseId: dsa?.id, dayOfWeek: 6, time: "09:00", durationMin: 90 },
  ];
}

const discreteMathTopics = [
  ["Logic & Proofs", "Propositional Logic", "Predicate Logic", "Proof Techniques"],
  ["Set Theory", "Sets & Operations", "Functions", "Relations"],
  ["Number Theory", "Divisibility", "Modular Arithmetic", "Cryptography Basics"],
  ["Induction & Recursion", "Mathematical Induction", "Strong Induction", "Recursive Definitions"],
  ["Counting", "Permutations & Combinations", "Pigeonhole Principle", "Binomial Theorem"],
  ["Graph Theory", "Graphs & Isomorphism", "Euler & Hamilton Paths", "Trees & Spanning Trees"],
  ["Discrete Probability", "Sample Spaces", "Conditional Probability", "Expected Value"],
] as const;

const daysAgoISO = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export function seedCourses(): Course[] {
  let done = 11; // partially through the course; older topics come due for review
  return [
    {
      id: id("course"),
      code: "MATH 232",
      name: "Discrete Mathematics",
      credits: 4,
      targetDate: addDays(todayISO(), 60),
      units: discreteMathTopics.map(([unitName, ...topics], i) => ({
        id: id("unit"),
        name: `Unit ${i + 1} · ${unitName}`,
        topics: topics.map((t) => {
          const isDone = done-- > 0;
          return {
            id: id("topic"),
            name: t,
            completed: isDone,
            // stagger ages so the spaced-review queue has real content
            completedAt: isDone ? daysAgoISO(4 + done * 2) : undefined,
          };
        }),
      })),
    },
    {
      id: id("course"),
      code: "CS 310",
      name: "Data Structures & Algorithms",
      credits: 4,
      targetDate: addDays(todayISO(), 90),
      units: [
        {
          id: id("unit"),
          name: "Unit 1 · Foundations",
          topics: [
            { id: id("topic"), name: "Asymptotic Analysis", completed: true, completedAt: daysAgoISO(12) },
            { id: id("topic"), name: "Arrays & Linked Lists", completed: true, completedAt: daysAgoISO(6) },
            { id: id("topic"), name: "Stacks & Queues", completed: false },
          ],
        },
        {
          id: id("unit"),
          name: "Unit 2 · Trees & Graphs",
          topics: [
            { id: id("topic"), name: "Binary Search Trees", completed: false },
            { id: id("topic"), name: "Heaps", completed: false },
            { id: id("topic"), name: "Graph Traversal (BFS/DFS)", completed: false },
          ],
        },
      ],
    },
  ];
}

export function seedAssignments(courses: Course[]): Assignment[] {
  const [discrete, dsa] = courses;
  const today = todayISO();
  return [
    { id: id("asg"), courseId: discrete?.id, title: "Problem Set 6 — Graph Theory", dueDate: addDays(today, 3), done: false },
    { id: id("asg"), courseId: discrete?.id, title: "Unit 6 self-check quiz", dueDate: addDays(today, 5), done: false },
    { id: id("asg"), courseId: dsa?.id, title: "Lab 3 — Queue implementation", dueDate: addDays(today, 8), done: false },
  ];
}

export function seedPantry(): PantryItem[] {
  const items: Array<[string, PantryItem["category"]]> = [
    ["Chickpeas", "pantry"],
    ["Lentils", "pantry"],
    ["Brown rice", "grains"],
    ["Quinoa", "grains"],
    ["Rolled oats", "grains"],
    ["Tofu", "protein"],
    ["Tempeh", "protein"],
    ["Spinach", "produce"],
    ["Kale", "produce"],
    ["Zucchini", "produce"],
    ["Bell peppers", "produce"],
    ["Cauliflower", "produce"],
    ["Mushrooms", "produce"],
    ["Cherry tomatoes", "produce"],
    ["Sweet potatoes", "produce"],
    ["Frozen edamame", "frozen"],
    ["Frozen berries", "frozen"],
    ["Nutritional yeast", "spices"],
    ["Smoked paprika", "spices"],
    ["Soy sauce", "pantry"],
    ["Vegetable broth", "pantry"],
    ["Cashews", "pantry"],
  ];
  return items.map(([name, category], i) => ({
    id: id("pan"),
    name,
    category,
    onHand: i % 3 !== 2, // a realistic mixed pantry
  }));
}

export function seedPlannedMeals(): PlannedMeal[] {
  const today = todayISO();
  return [
    { id: id("meal"), date: today, slot: "lunch", title: "Chickpea kale power bowl" },
    { id: id("meal"), date: today, slot: "dinner", title: "Tofu veggie stir-fry over brown rice" },
    { id: id("meal"), date: addDays(today, 1), slot: "dinner", title: "Lentil cauliflower curry" },
  ];
}

export function seedRoutines(): Routine[] {
  return [
    {
      id: "routine_lagree",
      name: "Lagree Pilates",
      focus: "Full-body slow-twitch endurance",
      exercises: [
        { id: id("ex"), name: "Plank to Pike", target: "2 min slow tempo" },
        { id: id("ex"), name: "Carriage Lunges", target: "90 sec / side" },
        { id: id("ex"), name: "Bear Crawl Hold", target: "60 sec" },
        { id: id("ex"), name: "Serve the Platter", target: "90 sec / arm" },
      ],
    },
    {
      id: "routine_glute",
      name: "Glute Training",
      focus: "Posterior chain strength",
      exercises: [
        { id: id("ex"), name: "Russian Deadlift", target: "4 × 10 moderate-heavy" },
        { id: id("ex"), name: "Hip Thrust", target: "4 × 12" },
        { id: id("ex"), name: "Bulgarian Split Squat", target: "3 × 10 / leg" },
        { id: id("ex"), name: "Cable Kickback", target: "3 × 15 / leg" },
      ],
    },
    {
      id: "routine_recovery",
      name: "Active Recovery",
      focus: "Mobility & circulation",
      exercises: [
        { id: id("ex"), name: "Incline Walk", target: "25 min easy pace" },
        { id: id("ex"), name: "Hip Flexor Stretch Series", target: "10 min" },
        { id: id("ex"), name: "Foam Roll — quads/glutes", target: "8 min" },
      ],
    },
  ];
}

/** Recent consecutive days (including today) as ISO dates, for streak seeds. */
function recentDays(count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(todayISO(), -i));
}

export function seedHabits(): Habit[] {
  return [
    { id: id("hab"), name: "Meditate", icon: "🧘", history: recentDays(12) },
    { id: id("hab"), name: "Read", icon: "📖", history: recentDays(8) },
    { id: id("hab"), name: "Workout", icon: "👟", history: recentDays(15) },
    { id: id("hab"), name: "No sugar", icon: "🌱", history: recentDays(10) },
  ];
}

export function seedKids(): Kid[] {
  return [
    { id: "kid_1", name: "Maya", color: "#8A5FD6", points: 42 },
    { id: "kid_2", name: "Eli", color: "#4E74E6", points: 35 },
  ];
}

export function seedActivities(): FamilyActivity[] {
  const today = todayISO();
  return [
    { id: id("act"), kidId: "kid_1", title: "Soccer practice", date: addDays(today, 1), time: "17:00", recurring: "weekly", category: "activity" },
    { id: id("act"), kidId: "kid_2", title: "Swim lesson", date: addDays(today, 2), time: "16:30", recurring: "weekly", category: "activity" },
    { id: id("act"), title: "Family library trip", date: addDays(today, 4), time: "10:30", category: "activity" },
    { id: id("act"), kidId: "kid_1", title: "Dentist checkup", date: today, time: "15:45", category: "appointment" },
    { id: id("act"), kidId: "kid_2", title: "Pediatrician — annual visit", date: addDays(today, 5), time: "09:30", category: "appointment", prepNote: "Bring insurance card + vaccination record" },
    { id: id("act"), kidId: "kid_1", title: "School recital", date: addDays(today, 6), time: "18:00", category: "school" },
  ];
}

export function seedChores(): Chore[] {
  return [
    { id: id("chore"), title: "Make bed & tidy room", points: 5 },
    { id: id("chore"), title: "Feed the pets", points: 5 },
    { id: id("chore"), title: "Empty dishwasher", points: 10 },
    { id: id("chore"), title: "Reading — 20 minutes", points: 15 },
    { id: id("chore"), title: "Math practice — one worksheet", points: 20 },
    { id: id("chore"), title: "Help with dinner prep", points: 10 },
  ];
}

export function seedRewards(): StoreReward[] {
  return [
    { id: id("rw"), title: "30 min extra screen time", cost: 25 },
    { id: id("rw"), title: "Pick Friday movie night film", cost: 40 },
    { id: id("rw"), title: "Ice cream outing", cost: 60 },
    { id: id("rw"), title: "Small toy / book ($10)", cost: 100 },
    { id: id("rw"), title: "Sleepover with a friend", cost: 150 },
  ];
}
