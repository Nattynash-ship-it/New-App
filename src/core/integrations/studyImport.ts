/**
 * Cross-app link: pull class data from a separate "study app" into Vela.
 *
 * Both apps are local-first with no shared server, so the bridge is a small,
 * documented JSON contract the study app publishes (e.g. a `classes.json`
 * committed to its GitHub repo, read via its raw URL) and Vela pulls. The same
 * shape also works as a file you export from one app and import into the other.
 *
 * THE CONTRACT (what the study app should emit):
 * {
 *   "source": "study-app",
 *   "version": 1,
 *   "classes": [
 *     {
 *       "code": "D278",
 *       "name": "Scripting and Programming Foundations",
 *       "credits": 3,
 *       "completed": false,
 *       "assignments": [
 *         { "title": "Project 1", "dueDate": "2026-09-15", "dueTime": "23:59", "done": false }
 *       ],
 *       "exams": [
 *         { "title": "Objective Assessment", "date": "2026-10-01", "time": "14:00" }
 *       ]
 *     }
 *   ]
 * }
 *
 * The parser is deliberately tolerant (accepts `courses` for `classes`,
 * `name`/`title`, `due`/`dueDate`/`date`) so small differences don't break it.
 */

export interface StudyAssignment {
  title: string;
  dueDate: string;
  dueTime?: string;
  done?: boolean;
}

export interface StudyExam {
  title: string;
  date: string;
  time?: string;
}

export interface StudyClass {
  code: string;
  name: string;
  credits?: number;
  completed?: boolean;
  assignments?: StudyAssignment[];
  exams?: StudyExam[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isoDate(v: unknown): string {
  const s = str(v);
  // Accept full ISO datetimes too — keep just the date part.
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
}

function timeOf(v: unknown): string | undefined {
  const s = str(v);
  const m = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : undefined;
}

function normAssignments(raw: unknown): StudyAssignment[] {
  if (!Array.isArray(raw)) return [];
  const out: StudyAssignment[] = [];
  for (const a of raw as Record<string, unknown>[]) {
    if (!a || typeof a !== "object") continue;
    const title = str(a.title) || str(a.name);
    const dueDate = isoDate(a.dueDate ?? a.due ?? a.date);
    if (!title || !dueDate) continue;
    out.push({
      title,
      dueDate,
      dueTime: timeOf(a.dueTime ?? a.time ?? a.due),
      done: Boolean(a.done ?? a.completed),
    });
  }
  return out;
}

function normExams(raw: unknown): StudyExam[] {
  if (!Array.isArray(raw)) return [];
  const out: StudyExam[] = [];
  for (const e of raw as Record<string, unknown>[]) {
    if (!e || typeof e !== "object") continue;
    const title = str(e.title) || str(e.name) || "Exam";
    const date = isoDate(e.date ?? e.dueDate ?? e.due);
    if (!date) continue;
    out.push({ title, date, time: timeOf(e.time ?? e.dueTime) });
  }
  return out;
}

export interface ParseResult {
  classes: StudyClass[];
  /** Totals for a friendly summary. */
  classCount: number;
  itemCount: number;
}

/**
 * Parse a study-app export (JSON string or already-parsed object) into
 * normalized classes. Throws a friendly Error when the shape is unusable.
 */
export function parseStudyExport(input: string | unknown): ParseResult {
  let data: unknown = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new Error("That doesn't look like valid JSON.");
    }
  }
  const root = data as Record<string, unknown>;
  const rawClasses = (root?.classes ?? root?.courses) as unknown;
  if (!Array.isArray(rawClasses)) {
    throw new Error('No "classes" list found. Expecting {"classes": [ ... ]}.');
  }

  const classes: StudyClass[] = [];
  let itemCount = 0;
  for (const c of rawClasses as Record<string, unknown>[]) {
    if (!c || typeof c !== "object") continue;
    const code = str(c.code) || str(c.id);
    const name = str(c.name) || str(c.title) || code;
    if (!code && !name) continue;
    const assignments = normAssignments(c.assignments ?? c.tasks);
    const exams = normExams(c.exams ?? c.tests);
    const creditsRaw = c.credits ?? c.creditHours;
    classes.push({
      code: code || name,
      name: name || code,
      credits: typeof creditsRaw === "number" ? creditsRaw : undefined,
      completed: Boolean(c.completed ?? c.passed),
      assignments,
      exams,
    });
    itemCount += assignments.length + exams.length;
  }

  if (classes.length === 0) {
    throw new Error("No classes were found in that data.");
  }
  return { classes, classCount: classes.length, itemCount };
}

/** Turn a public repo/file URL into a raw-content URL Vela can fetch. */
export function toRawUrl(url: string): string {
  const u = url.trim();
  // github.com/<user>/<repo>/blob/<branch>/<path> → raw.githubusercontent.com/...
  const m = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  return u;
}
