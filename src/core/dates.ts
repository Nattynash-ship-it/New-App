import type { ISODate, TimeHHMM } from "./types";

/** Local calendar date → "YYYY-MM-DD". */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** The Monday that starts the week containing `iso` (defaults to today). Used
 *  to scope recurring-schedule check-offs to the current week so they recycle. */
export function weekStartISO(iso: ISODate = todayISO()): ISODate {
  const diff = (fromISODate(iso).getDay() + 6) % 7; // Monday-based
  return addDays(iso, -diff);
}

export function isSameDay(a: ISODate, b: ISODate): boolean {
  return a === b;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatFriendly(iso: ISODate): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  const d = fromISODate(iso);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export function formatShort(iso: ISODate): string {
  const d = fromISODate(iso);
  return `${MONTH_NAMES[d.getMonth()]?.slice(0, 3)} ${d.getDate()}`;
}

export function formatTime(t: TimeHHMM): string {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr ?? 0);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return m === "00" ? `${h} ${ampm}` : `${h}:${m} ${ampm}`;
}

/** Days until a date; negative = past. */
export function daysUntil(iso: ISODate): number {
  const ms = fromISODate(iso).getTime() - fromISODate(todayISO()).getTime();
  return Math.round(ms / 86_400_000);
}

export function nowISO(): string {
  return new Date().toISOString();
}
