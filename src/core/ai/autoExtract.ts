"use client";

/**
 * Auto-extraction for uploads — whenever a file lands anywhere in the app, we
 * try to pull useful information out of it right away:
 *
 * - PDFs and text files are read on-device (pdf.js text layer / plain text),
 *   then mined for classes (transcript rows) and schedulable items (dates).
 * - Images go to the AI capture route when the deployment has a key; without
 *   one we say so instead of failing silently.
 *
 * The caller gets structured findings to offer for one-tap review — extraction
 * never adds anything to the store by itself.
 */

import { extractItems } from "../nlp/extract";
import { parseCourses, type ParsedCourse } from "../nlp/courses";
import type { ParsedIntent } from "../types";
import { extractPdfText, isPdf } from "./readFile";

export interface ExtractionFindings {
  fileName: string;
  classes: ParsedCourse[];
  items: ParsedIntent[];
  /** Set when the file type can't be mined (e.g. an image with no AI key). */
  note?: string;
}

function isTextLike(file: File): boolean {
  return (
    file.type.startsWith("text/") ||
    /\.(txt|md|csv)$/i.test(file.name)
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Mine an uploaded file for classes + schedulable items. Never throws. */
export async function extractFromFile(file: File): Promise<ExtractionFindings> {
  const empty: ExtractionFindings = { fileName: file.name, classes: [], items: [] };

  try {
    // On-device paths: PDF text layer and plain text.
    let text = "";
    if (isPdf(file)) {
      text = await extractPdfText(file).catch(() => "");
    } else if (isTextLike(file)) {
      text = await file.text().catch(() => "");
    } else if (file.type.startsWith("image/")) {
      // Images have no text layer — use the AI route when it's configured.
      const data = await fileToBase64(file);
      const res = await fetch("/api/ai/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: { mime: file.type, data } }),
      });
      if (res.ok) {
        const payload = (await res.json()) as { items?: ParsedIntent[] };
        return { ...empty, items: payload.items ?? [] };
      }
      return {
        ...empty,
        note: "Photos need the AI key to read — PDFs and text extract right on this device.",
      };
    } else {
      return { ...empty, note: "This file type can't be mined for dates or classes yet." };
    }

    if (text.trim().length < 20) {
      return isPdf(file)
        ? { ...empty, note: "This PDF looks scanned (no text layer) — nothing to extract on-device." }
        : empty;
    }

    return {
      fileName: file.name,
      classes: parseCourses(text),
      items: extractItems(text),
    };
  } catch {
    return empty;
  }
}
