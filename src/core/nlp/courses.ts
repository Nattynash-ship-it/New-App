/**
 * On-device course extractor — pulls class rows out of a pasted transcript or
 * schedule so you can add your classes without an API key. Claude does a better
 * job on a photographed/PDF transcript (see /api/ai/courses), but this handles
 * the common "CODE NUMBER  Name  Credits  Grade" transcript line offline.
 */

export interface ParsedCourse {
  code: string;
  name: string;
  credits: number;
  /** Passed on the transcript (a letter grade / Pass / Credit), vs. still in
   *  progress. Undefined when the line carries no grade signal. */
  completed?: boolean;
}

/** Read a transcript row's grade/status column: a passing grade → done, an
 *  in-progress marker → not done, anything else → unknown. */
function detectCompleted(line: string): boolean | undefined {
  if (
    /\b(in\s*progress|in-progress|\bIP\b|registered|enrolled|current|not\s*started|not\s*yet\s*started|planned|remaining|withdrawn|\bW\b)\b/i.test(
      line,
    )
  ) {
    return false;
  }
  // Word-based passing signals — case-insensitive (covers WGU "PASS",
  // "Competent", "Transferred", etc.).
  if (/\b(pass(ed)?|competent|complete[d]?|credit|\bCR\b|transferred|\bTR\b|satisfactory)\b/i.test(line)) {
    return true;
  }
  // Single-letter grades (A–D, with +/-) — case-SENSITIVE so a stray lowercase
  // letter in a course name doesn't read as a grade.
  if (/(?:^|\s)([ABCD][-+]?)(?:\s|$)/.test(line)) {
    return true;
  }
  return undefined;
}

/** Read a single grade token (a percentage, a letter, or a status word) into
 *  passed / in-progress / failed. A percentage ≥ 60 passes; A–D pass; F/W and
 *  "In Progress" don't. */
function gradeCompleted(grade: string): boolean | undefined {
  const g = grade.trim();
  if (/in\s?progress/i.test(g)) return false;
  const pct = g.match(/(\d{1,3})\s?%/);
  if (pct) return Number(pct[1]) >= 60;
  if (/\b[FW]\b/.test(g)) return false;
  if (/[ABCD][-+]?|pass|competent|transferred|satisfactory/i.test(g)) return true;
  return undefined;
}

function tidyName(s: string): string {
  const clean = s.replace(/\s{2,}/g, " ").trim();
  if (!clean) return clean;
  // If it's SHOUTING, title-case it; otherwise leave the author's casing.
  if (clean === clean.toUpperCase()) {
    return clean
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\b(Of|And|The|To|In|For|A|An)\b/g, (w) => w.toLowerCase());
  }
  return clean;
}

// Tokens that look like a course code but are really term/summary headers or
// dates — never a real department.
const NON_DEPARTMENT = new Set([
  "FALL", "SPRING", "SUMMER", "WINTER", "TERM", "YEAR", "PAGE", "TOTAL", "SEM",
  "GPA", "SESSION", "CREDITS", "UNITS", "ID",
  // Month + weekday names (a dated line like "Oct 10" isn't a class).
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "SEPT", "OCT", "NOV", "DEC",
  "MON", "TUE", "TUES", "WED", "THU", "THUR", "FRI", "SAT", "SUN",
]);

export function parseCourses(text: string): ParsedCourse[] {
  const out: ParsedCourse[] = [];
  const seen = new Set<string>();

  const push = (code: string, name: string, credits: number, completed: boolean | undefined) => {
    const clean = tidyName(name).replace(/[\s:–—\-|.,]+$/, "").slice(0, 64);
    if (clean.length < 3 || !/[a-z]/i.test(clean)) return;
    const key = code.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ code, name: clean, credits, completed });
  };

  // Pass 1 — "Dept Num: Name  87 %, B+" anywhere in the text. Transcript tables
  // often survive PDF extraction as one run with each row date-stamped, so a
  // global scan catches courses even when line breaks land badly.
  const colonRe =
    /\b([A-Z][A-Za-z]{1,4})\s?-?\s?(\d{2,4})\s*:\s*([A-Za-z][A-Za-z0-9 &/'.-]{2,60}?)\s*(\d{1,3}\s?%|[,\s]+[ABCDF][-+]?\b|Pass(?:ed)?|Competent|Transferred|In\s?Progress|Satisfactory)/gi;
  let cm: RegExpExecArray | null;
  while ((cm = colonRe.exec(text)) !== null && out.length < 60) {
    const dept = cm[1]!.toUpperCase();
    if (NON_DEPARTMENT.has(dept)) continue;
    push(`${dept} ${cm[2]}`, cm[3]!, 3, gradeCompleted(cm[4]!));
  }

  // Pass 2 — line-by-line "CODE NUM  Name  Credits  Grade" (clean transcripts).
  for (const raw of text.split(/[\n\r]+/)) {
    // Strip a leading date/term prefix ("04/13/2026 ", "/2026 ") so the course
    // code starts the line — real transcripts often stamp each row with a date.
    const line = raw.trim().replace(/^[\d/.\-\s]+/, "").trim();
    if (line.length < 5) continue;

    // Course code — three shapes:
    //  • traditional "MATH 232" / Title-case "Math 108" (uppercase-first dept)
    //  • "CS310", "BIOL 101L"
    //  • WGU-style "D278", "C949" (single letter glued to a number)
    const codeM =
      line.match(/\b([A-Z][A-Za-z]{1,3})\s?-?\s?(\d{2,4}[A-Za-z]?)\b/) ||
      line.match(/\b([A-Z])(\d{2,4}[A-Za-z]?)\b/);
    if (!codeM || codeM.index === undefined) continue;
    const dept = codeM[1]!.toUpperCase();
    // Skip "Fall 2024", "Term 3", "Total 90", common-word + year, etc.
    if (NON_DEPARTMENT.has(dept)) continue;
    // Single-letter WGU codes read best glued ("D278"); others get a space.
    const code = dept.length === 1 ? `${dept}${codeM[2]}` : `${dept} ${codeM[2]}`;

    const rest = line.slice(codeM.index + codeM[0].length).trim();

    // Credits: the first small number (1–6, maybe decimal) after the name.
    let credits = 3;
    const credM = rest.match(/\b([1-6](?:\.\d{1,2})?)\b/);
    if (credM?.[1]) credits = Math.max(1, Math.round(Number(credM[1])));

    // Name: everything before the first number, minus separators and trailing
    // grade/status/section noise.
    const name = rest
      .replace(/^[\s:–—\-|.]+/, "")
      .replace(/\s*\d.*$/, "") // cut at the first digit (credits/grade/section/time)
      .replace(
        /\b(A|B|C|D|F|W|P|IP|CR|NC|Pass(ed)?|Fail(ed)?|Competent|Transferred|In Progress|Credit|Units?|Grade|GPA|Term|Section)\b.*$/i,
        "",
      );

    push(code, name, credits, detectCompleted(line));
    if (out.length >= 60) break;
  }

  return out;
}
