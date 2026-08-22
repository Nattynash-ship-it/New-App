/**
 * Turn agenda items into a calendar file (.ics) the user can add to Google,
 * Apple, or Outlook — so their phone reminds them natively even when Vela is
 * closed. Each event carries a 30-minute-before alarm. Undated or timeless
 * items default to a 9:00 AM slot so they still surface with a reminder.
 *
 * Downloads use a Blob URL; this runs only in the browser (the real app, not a
 * sandboxed artifact), where .ics downloads open straight into the calendar app.
 */

export interface CalEvent {
  id: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  time?: string; // HH:MM
  description?: string;
  durationMin?: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Floating local time stamp, e.g. 20260719T090000 (no Z — calendars read it as local). */
function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function vevent(e: CalEvent): string {
  const [y, m, d] = e.date.split("-").map(Number);
  const [hh, mm] = (e.time ?? "09:00").split(":").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, d, hh ?? 9, mm ?? 0);
  const end = new Date(start.getTime() + (e.durationMin ?? 30) * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:${e.id}@vela`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function buildICS(events: CalEvent[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vela//Life Hub//EN",
    "CALSCALE:GREGORIAN",
    ...events.map(vevent),
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Build the .ics and hand it to the browser to open/save into a calendar. */
export function downloadICS(filename: string, events: CalEvent[]): void {
  if (events.length === 0) return;
  const blob = new Blob([buildICS(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** A Google Calendar "add event" link — one tap on mobile, no file needed. */
export function googleCalUrl(e: CalEvent): string {
  const [y, m, d] = e.date.split("-").map(Number);
  const [hh, mm] = (e.time ?? "09:00").split(":").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, d, hh ?? 9, mm ?? 0);
  const end = new Date(start.getTime() + (e.durationMin ?? 30) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: e.description ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
