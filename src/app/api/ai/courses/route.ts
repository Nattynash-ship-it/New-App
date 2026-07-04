import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseCourses } from "@/core/nlp/courses";

export const runtime = "nodejs";
export const maxDuration = 45;

const COURSES_SCHEMA = {
  type: "object",
  properties: {
    courses: {
      type: "array",
      description: "Every distinct class/course found.",
      items: {
        type: "object",
        properties: {
          code: { type: "string", description: "course code, e.g. MATH 232" },
          name: { type: "string", description: "course title" },
          credits: { type: "number", description: "credit hours (default 3 if unknown)" },
        },
        required: ["code", "name", "credits"],
        additionalProperties: false,
      },
    },
  },
  required: ["courses"],
  additionalProperties: false,
} as const;

interface Body {
  text?: unknown;
  file?: unknown;
}

interface RawCourse {
  code: string;
  name: string;
  credits: number;
}

export async function POST(request: Request) {
  let text = "";
  let file: { mime: string; data: string } | null = null;
  try {
    const body = (await request.json()) as Body;
    if (typeof body.text === "string") text = body.text.trim().slice(0, 8000);
    const raw = body.file;
    if (
      raw &&
      typeof raw === "object" &&
      typeof (raw as { mime?: unknown }).mime === "string" &&
      typeof (raw as { data?: unknown }).data === "string"
    ) {
      file = raw as { mime: string; data: string };
    }
    if (!text && !file) {
      return NextResponse.json({ error: "Provide `text` or a `file`." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // No key: text parses on-device; files need the model to read them.
  if (!process.env.ANTHROPIC_API_KEY) {
    if (file && !text) {
      return NextResponse.json(
        { error: "Reading a transcript file needs an ANTHROPIC_API_KEY. Paste the text instead." },
        { status: 503 },
      );
    }
    return NextResponse.json({ courses: parseCourses(text), engine: "local" });
  }

  try {
    const client = new Anthropic();
    const content: Anthropic.ContentBlockParam[] = [];
    if (file) {
      if (file.mime === "application/pdf") {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } });
      } else {
        const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
        const mediaType = (allowed.includes(file.mime) ? file.mime : "image/jpeg") as
          | "image/png"
          | "image/jpeg"
          | "image/gif"
          | "image/webp";
        content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: file.data } });
      }
    }
    content.push({
      type: "text",
      text: file
        ? "Extract every class/course from this transcript or class schedule."
        : `Extract every class/course from this transcript text:\n\n${text}`,
    });

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: COURSES_SCHEMA } },
      system:
        "You read academic transcripts and class schedules and return the list of courses. Use the printed credit hours; default to 3 if a course lists none. Keep codes like 'MATH 232' and clean human titles.",
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ courses: text ? parseCourses(text) : [], engine: "local" });
    }
    const rawText = response.content.find((b) => b.type === "text")?.text;
    if (!rawText) throw new Error("Empty model response");
    const parsed = JSON.parse(rawText) as { courses: RawCourse[] };
    const courses = (parsed.courses ?? [])
      .filter((c) => c && typeof c.code === "string" && typeof c.name === "string")
      .map((c) => ({
        code: c.code.trim().slice(0, 20),
        name: c.name.trim().slice(0, 100),
        credits: Math.max(1, Math.round(Number(c.credits) || 3)),
      }));
    return NextResponse.json({ courses, engine: "claude" });
  } catch (err) {
    console.error("Course extract falling back to local:", err);
    return NextResponse.json({ courses: text ? parseCourses(text) : [], engine: "local" });
  }
}
