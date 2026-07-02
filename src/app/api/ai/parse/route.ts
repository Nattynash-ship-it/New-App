import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseQuickAdd } from "@/core/nlp/parser";
import type { ParsedIntent } from "@/core/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: ["meeting", "assignment", "family_activity", "meal", "workout", "event"],
    },
    title: { type: "string" },
    date: { type: "string", description: "ISO date YYYY-MM-DD" },
    time: { type: ["string", "null"], description: "24h HH:MM or null if unspecified" },
  },
  required: ["kind", "title", "date", "time"],
  additionalProperties: false,
} as const;

interface ParseRequestBody {
  text?: unknown;
}

export async function POST(request: Request) {
  let text: string;
  try {
    const body = (await request.json()) as ParseRequestBody;
    if (typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "Provide a non-empty `text` string." }, { status: 400 });
    }
    text = body.text.trim().slice(0, 500);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // The deterministic parser is the default; Claude refines low-confidence input.
  const local = parseQuickAdd(text);
  if (!process.env.ANTHROPIC_API_KEY || local.confidence >= 0.75) {
    return NextResponse.json({ intent: local, engine: "local" });
  }

  try {
    const client = new Anthropic();
    const today = new Date().toISOString().slice(0, 10);
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: INTENT_SCHEMA } },
      system: `Parse a natural-language scheduling phrase from a personal life-management
app into a structured intent. Today's date is ${today}. Resolve relative dates
("tomorrow", "next Friday") against today. "meeting" = work; "assignment" = school
deadline; "family_activity" = kids' schedule; "meal" = meal plan; "workout" = fitness.
Use "event" only when nothing else fits. The title should be short and clean, without
the date/time words.`,
      messages: [{ role: "user", content: text }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ intent: local, engine: "local" });
    }

    const raw = response.content.find((b) => b.type === "text")?.text;
    if (!raw) throw new Error("Empty model response");
    const parsed = JSON.parse(raw) as {
      kind: ParsedIntent["kind"];
      title: string;
      date: string;
      time: string | null;
    };
    const intent: ParsedIntent = {
      kind: parsed.kind,
      title: parsed.title,
      date: parsed.date,
      time: parsed.time ?? undefined,
      confidence: 0.95,
    };
    return NextResponse.json({ intent, engine: "claude" });
  } catch (err) {
    console.error("NL parse falling back to local:", err);
    return NextResponse.json({ intent: local, engine: "local" });
  }
}
