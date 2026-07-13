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

export function parseCourses(text: string): ParsedCourse[] {
  const out: ParsedCourse[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/[\n\r]+/)) {
    const line = raw.trim();
    if (line.length < 5) continue;

    // Course code — two shapes:
    //  • traditional "MATH 232", "CS310", "BIOL 101L" (2–4 letters + number)
    //  • WGU-style "D278", "C949", "C182" (single letter glued to a number)
    const codeM =
      line.match(/\b([A-Z]{2,4})\s?-?\s?(\d{2,4}[A-Z]?)\b/) ||
      line.match(/\b([A-Z])(\d{2,4}[A-Z]?)\b/);
    if (!codeM || codeM.index === undefined) continue;
    // Single-letter WGU codes read best glued ("D278"); others get a space.
    const code = codeM[1]!.length === 1 ? `${codeM[1]}${codeM[2]}` : `${codeM[1]} ${codeM[2]}`;

    const rest = line.slice(codeM.index + codeM[0].length).trim();

    // Credits: the first small number (1–6, maybe decimal) after the name.
    let credits = 3;
    const credM = rest.match(/\b([1-6](?:\.\d{1,2})?)\b/);
    if (credM?.[1]) credits = Math.max(1, Math.round(Number(credM[1])));

    // Name: everything before that number, minus separators and trailing
    // grade/status noise.
    const name = tidyName(
      rest
        .replace(/^[\s:–-]+/, "")
        .replace(/\s*\b\d+(?:\.\d+)?\b.*$/, "")
        .replace(/\b(A|B|C|D|F|W|P|IP|CR|NC|Pass|Fail|In Progress|Credit|Units?|Grade|GPA)\b.*$/i, ""),
    );
    if (name.length < 3) continue;

    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ code, name, credits, completed: detectCompleted(line) });
    if (out.length >= 40) break;
  }

  return out;
}
