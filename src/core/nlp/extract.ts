/**
 * On-device multi-item extraction — the local fallback for Smart Capture.
 *
 * Where `parseQuickAdd` turns one phrase into one intent, this splits a whole
 * block of text (a pasted school email, a syllabus excerpt, a dictated
 * brain-dump) into lines and sentences and pulls a structured intent out of
 * each one that clearly references a date or a known activity. Claude does a
 * better job on messy prose, but this keeps the feature working with zero
 * config and no network.
 */

import { parseQuickAdd } from "./parser";
import type { ParsedIntent } from "../types";

const MAX_ITEMS = 15;

export function extractItems(text: string): ParsedIntent[] {
  const chunks = text
    .split(/[\n\r]+|(?<=[.!?;])\s+/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 6);

  const items: ParsedIntent[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const intent = parseQuickAdd(chunk);
    // Keep only lines that anchor to a date or a recognized activity — a bare
    // sentence with neither is almost never something to schedule.
    if (intent.confidence < 0.5) continue;
    const key = `${intent.kind}|${intent.title.toLowerCase()}|${intent.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(intent);
    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}
