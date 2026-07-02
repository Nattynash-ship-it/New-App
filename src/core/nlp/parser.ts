/**
 * Lightweight on-device natural-language parser for quick add.
 *
 * Handles inputs like:
 *   "Add a meeting tomorrow at 2 PM for policy review"
 *   "Discrete math assignment due Friday"
 *   "Soccer practice for Maya on Tuesday at 5pm"
 *   "Lagree class Saturday 9am"
 *
 * Deterministic and dependency-free so it runs identically on web and
 * React Native. When confidence is low, callers may escalate to the
 * /api/ai/parse route (Claude) for a smarter parse.
 */

import { addDays, todayISO, toISODate, fromISODate } from "../dates";
import type { ISODate, ParsedIntent, ParsedIntentKind, TimeHHMM } from "../types";

const KIND_KEYWORDS: Array<{ kind: ParsedIntentKind; words: RegExp }> = [
  { kind: "meeting", words: /\b(meeting|call|sync|standup|1:1|one[- ]on[- ]one|interview|review session)\b/i },
  { kind: "assignment", words: /\b(assignment|homework|essay|exam|quiz|problem set|pset|lab|project due|due)\b/i },
  { kind: "family_activity", words: /\b(practice|recital|playdate|pickup|drop[- ]?off|school event|game|birthday|dentist|pediatrician|soccer|ballet|swim)\b/i },
  { kind: "meal", words: /\b(dinner|lunch|breakfast|meal prep|cook)\b/i },
  { kind: "workout", words: /\b(workout|gym|lagree|pilates|run|lift|glute|leg day|yoga|training)\b/i },
];

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6,
  august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

interface DateMatch {
  date: ISODate;
  matched: string;
}

function parseDate(text: string): DateMatch | null {
  const lower = text.toLowerCase();
  const today = todayISO();

  const relative = lower.match(/\b(today|tonight|tomorrow|day after tomorrow)\b/);
  if (relative?.[1]) {
    const offsets: Record<string, number> = { today: 0, tonight: 0, tomorrow: 1, "day after tomorrow": 2 };
    return { date: addDays(today, offsets[relative[1]] ?? 0), matched: relative[0] };
  }

  // "next friday" / "this friday" / bare weekday
  const weekday = lower.match(/\b(next |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/);
  if (weekday?.[2]) {
    const target = WEEKDAYS[weekday[2]];
    if (target !== undefined) {
      const now = fromISODate(today);
      let diff = (target - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7; // bare weekday means the upcoming one
      if (weekday[1]?.trim() === "next" && diff <= 3) diff += 7;
      return { date: addDays(today, diff), matched: weekday[0] };
    }
  }

  // "July 15" / "15 July"
  const monthName = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.? (\d{1,2})\b/);
  if (monthName?.[1] && monthName[2]) {
    const m = MONTHS[monthName[1]];
    const day = Number(monthName[2]);
    if (m !== undefined && day >= 1 && day <= 31) {
      const now = fromISODate(today);
      let year = now.getFullYear();
      const candidate = new Date(year, m, day);
      if (toISODate(candidate) < today) year += 1;
      return { date: toISODate(new Date(year, m, day)), matched: monthName[0] };
    }
  }

  // "7/15" or "7-15"
  const numeric = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  if (numeric?.[1] && numeric[2]) {
    const m = Number(numeric[1]) - 1;
    const day = Number(numeric[2]);
    if (m >= 0 && m <= 11 && day >= 1 && day <= 31) {
      const now = fromISODate(today);
      let year = now.getFullYear();
      if (toISODate(new Date(year, m, day)) < today) year += 1;
      return { date: toISODate(new Date(year, m, day)), matched: numeric[0] };
    }
  }

  const nextWeek = lower.match(/\bnext week\b/);
  if (nextWeek) return { date: addDays(today, 7), matched: nextWeek[0] };

  return null;
}

interface TimeMatch {
  time: TimeHHMM;
  matched: string;
}

function parseTime(text: string): TimeMatch | null {
  const lower = text.toLowerCase();

  // "at 2 PM", "2:30pm", "at 14:00"
  const m = lower.match(/\b(?:at |@ ?)?(\d{1,2})(?::(\d{2}))? ?(am|pm|a\.m\.|p\.m\.)\b/);
  if (m?.[1]) {
    let h = Number(m[1]);
    const min = m[2] ?? "00";
    const pm = (m[3] ?? "").startsWith("p");
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return { time: `${String(h).padStart(2, "0")}:${min}`, matched: m[0] };
  }

  const military = lower.match(/\b(?:at )(\d{1,2}):(\d{2})\b/);
  if (military?.[1] && military[2]) {
    const h = Number(military[1]);
    if (h >= 0 && h <= 23) {
      return { time: `${String(h).padStart(2, "0")}:${military[2]}`, matched: military[0] };
    }
  }

  if (/\btonight\b/.test(lower)) return { time: "19:00", matched: "tonight" };
  if (/\bnoon\b/.test(lower)) return { time: "12:00", matched: "noon" };

  return null;
}

function detectKind(text: string): { kind: ParsedIntentKind; confident: boolean } {
  for (const { kind, words } of KIND_KEYWORDS) {
    if (words.test(text)) return { kind, confident: true };
  }
  return { kind: "event", confident: false };
}

function cleanTitle(text: string, remove: string[]): string {
  let title = text;
  for (const fragment of remove) {
    if (fragment) title = title.replace(new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
  }
  title = title
    .replace(/^\s*(add|schedule|create|remind me( about| to)?|put)\s+(an?\s+)?/i, "")
    .replace(/\b(next|this)\s*$/i, "")
    .replace(/\b(at|on|due|for)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[,\-–\s]+|[,\-–\s]+$/g, "");
  if (!title) return "Untitled";
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Parse a natural-language quick-add phrase into a structured intent.
 * Always returns a best-effort result; check `confidence` to decide whether
 * to escalate to the AI parsing route.
 */
export function parseQuickAdd(input: string): ParsedIntent {
  const text = input.trim();
  const dateMatch = parseDate(text);
  const timeMatch = parseTime(text);
  const { kind, confident } = detectKind(text);

  const title = cleanTitle(text, [dateMatch?.matched ?? "", timeMatch?.matched ?? ""]);

  let confidence = 0.35;
  if (dateMatch) confidence += 0.3;
  if (timeMatch) confidence += 0.15;
  if (confident) confidence += 0.2;

  return {
    kind,
    title,
    date: dateMatch?.date ?? todayISO(),
    time: timeMatch?.time,
    confidence: Math.min(confidence, 1),
  };
}
