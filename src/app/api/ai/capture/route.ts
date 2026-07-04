import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractItems } from "@/core/nlp/extract";
import type { ParsedIntent } from "@/core/types";

export const runtime = "nodejs";
export const maxDuration = 45;

const KINDS = ["meeting", "assignment", "family_activity", "meal", "workout", "event"] as const;

const CAPTURE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Every distinct event, deadline, appointment, or task found.",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: KINDS },
          title: { type: "string", description: "short, clean, no date/time words" },
          date: { type: "string", description: "ISO date YYYY-MM-DD" },
          time: { type: ["string", "null"], description: "24h HH:MM or null" },
        },
        required: ["kind", "title", "date", "time"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

interface CaptureBody {
  text?: unknown;
  image?: unknown;
}

interface RawItem {
  kind: ParsedIntent["kind"];
  title: string;
  date: string;
  time: string | null;
}

function toIntents(raw: RawItem[]): ParsedIntent[] {
  return raw
    .filter((i) => i && typeof i.title === "string" && typeof i.date === "string")
    .map((i) => ({
      kind: KINDS.includes(i.kind) ? i.kind : "event",
      title: i.title.trim().slice(0, 120) || "Untitled",
      date: i.date,
      time: i.time ?? undefined,
      confidence: 0.95,
    }));
}

const SYSTEM = (today: string) => `You extract a schedule from messy real-world input
for a busy parent/student/professional. Today's date is ${today}. Pull out EVERY
distinct event, deadline, appointment, or task. Resolve relative dates
("tomorrow", "next Friday", "the 10th") against today. Classify each: "meeting" =
work; "assignment" = school deadline; "family_activity" = kids' activities,
appointments, school events; "meal" = a meal to plan; "workout" = fitness; "event"
only when nothing else fits. Keep titles short and clean, without the date/time
words. If there is genuinely nothing schedulable, return an empty items array.`;

export async function POST(request: Request) {
  let text = "";
  let image: { mime: string; data: string } | null = null;
  try {
    const body = (await request.json()) as CaptureBody;
    if (typeof body.text === "string") text = body.text.trim().slice(0, 8000);
    if (
      body.image &&
      typeof body.image === "object" &&
      typeof (body.image as { mime?: unknown }).mime === "string" &&
      typeof (body.image as { data?: unknown }).data === "string"
    ) {
      const img = body.image as { mime: string; data: string };
      image = { mime: img.mime, data: img.data };
    }
    if (!text && !image) {
      return NextResponse.json({ error: "Provide `text` or an `image`." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // No API key: text still works via the on-device extractor; images can't.
  if (!process.env.ANTHROPIC_API_KEY) {
    if (image && !text) {
      return NextResponse.json(
        { error: "Reading photos needs an ANTHROPIC_API_KEY. Paste or dictate the text instead." },
        { status: 503 },
      );
    }
    return NextResponse.json({ items: extractItems(text), engine: "local" });
  }

  try {
    const client = new Anthropic();
    const today = new Date().toISOString().slice(0, 10);

    const content: Anthropic.ContentBlockParam[] = [];
    if (image) {
      const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      const mediaType = allowed.includes(image.mime) ? image.mime : "image/jpeg";
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: image.data,
        },
      });
    }
    content.push({
      type: "text",
      text: image
        ? "Extract every event, appointment, deadline, or task from this photo (a flyer, schedule, or appointment card)."
        : `Extract everything schedulable from this text:\n\n${text}`,
    });

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: CAPTURE_SCHEMA } },
      system: SYSTEM(today),
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ items: text ? extractItems(text) : [], engine: "local" });
    }

    const rawText = response.content.find((b) => b.type === "text")?.text;
    if (!rawText) throw new Error("Empty model response");
    const parsed = JSON.parse(rawText) as { items: RawItem[] };
    return NextResponse.json({ items: toIntents(parsed.items ?? []), engine: "claude" });
  } catch (err) {
    console.error("Capture falling back to local:", err);
    // Image-only requests have no local path; surface an empty result gracefully.
    return NextResponse.json({ items: text ? extractItems(text) : [], engine: "local" });
  }
}
