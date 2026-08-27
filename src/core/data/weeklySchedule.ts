/**
 * The user's recurring weekly time-block schedule — her real rhythm around
 * work, her son (morning routine, two daily cooks, the 7 PM reading + kind-words
 * ritual), therapy, the transit commute (which doubles as study time), 3h of
 * study and 1h of movement a day, and Sunday's clean + meal-prep reset.
 *
 * Blocks are recurring by weekday (0 = Sunday … 6 = Saturday). Times are 24h
 * "HH:MM". This seeds the "My Week" view; it's fully editable in the app.
 */

export type BlockCategory =
  | "work"
  | "study"
  | "workout"
  | "meals"
  | "son"
  | "self"
  | "home"
  | "sleep";

export interface WeekBlock {
  id: string;
  /** 0 = Sunday … 6 = Saturday. */
  day: number;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  title: string;
  category: BlockCategory;
}

export const CATEGORY_META: Record<BlockCategory, { label: string; color: string }> = {
  work: { label: "Work", color: "#3f66e0" },
  study: { label: "Study", color: "#7c3aed" },
  workout: { label: "Movement", color: "#e0476f" },
  meals: { label: "Meals & prep", color: "#16a06a" },
  son: { label: "My son", color: "#dd8412" },
  self: { label: "Self-care", color: "#0f9aa8" },
  home: { label: "Home", color: "#6b7488" },
  sleep: { label: "Sleep / wake", color: "#9aa1b2" },
};

/** [day, start, end, category, title] — compact source, expanded below. */
type Raw = [number, string, string, BlockCategory, string];

const RAW: Raw[] = [
  // Sunday (0) — reset: laundry, clean, meal-prep
  [0, "05:00", "06:00", "home", "Start laundry + coffee"],
  [0, "06:00", "07:00", "workout", "Movement — mobility + light row (recovery)"],
  [0, "07:00", "10:00", "home", "Clean the apartment"],
  [0, "10:00", "10:30", "meals", "Groceries arrive · put away"],
  [0, "10:30", "12:30", "meals", "Meal prep — batch-cook the week"],
  [0, "12:30", "13:30", "self", "Lunch + rest"],
  [0, "13:30", "16:30", "study", "Study — bank the week (3h)"],
  [0, "16:30", "18:00", "son", "Family time"],
  [0, "18:00", "18:45", "meals", "Cook dinner"],
  [0, "18:45", "19:00", "son", "Dinner with my son"],
  [0, "19:00", "19:30", "son", "My son reads to me + kind words"],
  [0, "19:30", "20:00", "home", "Prep for Monday"],
  [0, "20:00", "21:30", "self", "Wind-down · bed"],

  // Monday (1) — WFH, work 10–7
  [1, "04:30", "05:00", "sleep", "Wake · coffee"],
  [1, "05:00", "06:00", "workout", "Movement — row intervals + 10 lb upper"],
  [1, "06:00", "07:30", "son", "Get my son ready for school"],
  [1, "07:30", "08:00", "home", "Sort laundry + tidy up"],
  [1, "08:00", "09:00", "study", "Study — block 1"],
  [1, "09:00", "10:00", "study", "Study — block 2"],
  [1, "10:00", "13:00", "work", "Work (from home)"],
  [1, "13:00", "14:00", "self", "Therapy"],
  [1, "14:00", "15:00", "self", "Nap"],
  [1, "15:00", "15:30", "meals", "Cook my son's after-school meal"],
  [1, "15:30", "19:00", "work", "Work (from home) · my son's home"],
  [1, "19:00", "19:30", "son", "My son reads to me + kind words"],
  [1, "19:30", "20:00", "meals", "Dinner together (reheat prep)"],
  [1, "20:00", "20:30", "home", "Iron + prep bags"],
  [1, "20:30", "21:30", "study", "Study — block 3"],
  [1, "21:30", "22:00", "son", "Wind-down + bedtime"],

  // Tuesday (2) — office
  [2, "04:30", "05:00", "sleep", "Wake · coffee"],
  [2, "05:00", "06:00", "workout", "Movement — bike HIIT + med-ball core"],
  [2, "06:00", "07:30", "son", "Get my son ready for school"],
  [2, "07:30", "07:45", "home", "Get ready + leave"],
  [2, "07:45", "09:00", "study", "Commute — study on the train"],
  [2, "09:00", "12:00", "work", "Work (office)"],
  [2, "12:00", "13:00", "study", "Lunch + study"],
  [2, "13:00", "16:00", "work", "Work (office)"],
  [2, "16:00", "17:30", "study", "Commute — study on the train"],
  [2, "17:30", "18:15", "meals", "Cook dinner"],
  [2, "18:15", "19:00", "son", "Dinner with my son"],
  [2, "19:00", "19:30", "son", "My son reads to me + kind words"],
  [2, "19:30", "20:00", "home", "Iron + prep bags"],
  [2, "20:00", "22:00", "self", "Wind-down · bed"],

  // Wednesday (3) — office
  [3, "04:30", "05:00", "sleep", "Wake · coffee"],
  [3, "05:00", "06:00", "workout", "Movement — weighted-rope + 5/10 lb full body"],
  [3, "06:00", "07:30", "son", "Get my son ready for school"],
  [3, "07:30", "07:45", "home", "Get ready + leave"],
  [3, "07:45", "09:00", "study", "Commute — study on the train"],
  [3, "09:00", "12:00", "work", "Work (office)"],
  [3, "12:00", "13:00", "study", "Lunch + study"],
  [3, "13:00", "16:00", "work", "Work (office)"],
  [3, "16:00", "17:30", "study", "Commute — study on the train"],
  [3, "17:30", "18:15", "meals", "Cook dinner"],
  [3, "18:15", "19:00", "son", "Dinner with my son"],
  [3, "19:00", "19:30", "son", "My son reads to me + kind words"],
  [3, "19:30", "20:00", "home", "Iron + prep bags"],
  [3, "20:00", "22:00", "self", "Wind-down · bed"],

  // Thursday (4) — WFH, work 8–4
  [4, "04:30", "05:00", "sleep", "Wake · coffee"],
  [4, "05:00", "06:00", "workout", "Movement — row steady + 10 lb glutes/lower"],
  [4, "06:00", "07:30", "son", "Get my son ready for school"],
  [4, "07:30", "08:00", "home", "Breakfast + quick tidy"],
  [4, "08:00", "12:00", "work", "Work (from home)"],
  [4, "12:00", "13:00", "study", "Lunch + study — block 1"],
  [4, "13:00", "16:00", "work", "Work (from home)"],
  [4, "16:00", "16:30", "meals", "Cook my son's after-school meal"],
  [4, "16:30", "17:30", "study", "Study — block 2"],
  [4, "17:30", "18:15", "meals", "Cook dinner"],
  [4, "18:15", "19:00", "son", "Dinner with my son"],
  [4, "19:00", "19:30", "son", "My son reads to me + kind words"],
  [4, "19:30", "20:00", "home", "Iron + prep bags"],
  [4, "20:00", "21:00", "study", "Study — block 3"],
  [4, "21:00", "22:00", "son", "Family + wind-down"],

  // Friday (5) — WFH, work 8–4
  [5, "04:30", "05:00", "sleep", "Wake · coffee"],
  [5, "05:00", "06:00", "workout", "Movement — bike intervals + med-ball core"],
  [5, "06:00", "07:30", "son", "Get my son ready for school"],
  [5, "07:30", "08:00", "home", "Breakfast + quick tidy"],
  [5, "08:00", "12:00", "work", "Work (from home)"],
  [5, "12:00", "13:00", "study", "Lunch + study — block 1"],
  [5, "13:00", "16:00", "work", "Work (from home)"],
  [5, "16:00", "16:30", "meals", "Cook my son's after-school meal"],
  [5, "16:30", "17:30", "study", "Study — block 2"],
  [5, "17:30", "18:15", "meals", "Cook dinner"],
  [5, "18:15", "19:00", "son", "Dinner with my son"],
  [5, "19:00", "19:30", "son", "My son reads to me + kind words"],
  [5, "19:30", "20:00", "home", "Iron + prep bags"],
  [5, "20:00", "21:00", "study", "Study — block 3"],
  [5, "21:00", "22:00", "son", "Family movie / wind-down"],

  // Saturday (6) — free: plan & shop
  [6, "06:00", "07:00", "sleep", "Slow morning"],
  [6, "07:00", "08:00", "workout", "Movement — long row or bike + weights"],
  [6, "08:00", "09:00", "son", "Breakfast together"],
  [6, "09:00", "12:00", "study", "Study — bank the week (3h)"],
  [6, "12:00", "13:00", "meals", "Cook lunch together"],
  [6, "13:00", "14:00", "son", "Free / family time"],
  [6, "14:00", "15:00", "meals", "Plan next week's meals"],
  [6, "15:00", "18:00", "son", "Free / rest / family"],
  [6, "18:00", "18:45", "meals", "Cook dinner"],
  [6, "18:45", "19:00", "son", "Dinner with my son"],
  [6, "19:00", "19:30", "son", "My son reads to me + kind words"],
  [6, "19:30", "20:00", "meals", "Order groceries for the week"],
  [6, "20:00", "21:30", "self", "Wind-down · bed"],
];

export const DEFAULT_WEEK_BLOCKS: WeekBlock[] = RAW.map(([day, start, end, category, title], i) => ({
  id: `wk_${day}_${start.replace(":", "")}_${i}`,
  day,
  start,
  end,
  title,
  category,
}));

/** Minutes past midnight, for sorting/summing. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
