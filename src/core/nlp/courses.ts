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

    // Course code like "MATH 232", "CS310", "BIOL 101L".
    const codeM = line.match(/\b([A-Z]{2,4})\s?-?\s?(\d{2,4}[A-Z]?)\b/);
    if (!codeM || codeM.index === undefined) continue;
    const code = `${codeM[1]} ${codeM[2]}`;

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
    out.push({ code, name, credits });
    if (out.length >= 40) break;
  }

  return out;
}
