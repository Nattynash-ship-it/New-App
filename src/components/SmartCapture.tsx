"use client";

import { useEffect, useRef, useState } from "react";
import { Card, DOMAIN_STYLES, SectionTitle } from "./ui";
import { extractItems } from "@/core/nlp/extract";
import { extractPdfText, isPdf } from "@/core/ai/readFile";
import { formatFriendly, formatTime } from "@/core/dates";
import { useHub } from "@/core/store/hub";
import type { ParsedIntent, ParsedIntentKind } from "@/core/types";

// "class" is a review-only kind: it isn't a schedulable intent, it routes the
// item into your degree plan (addCourse) instead of onto the calendar.
type ReviewKind = ParsedIntentKind | "class";

const KIND_TO_DOMAIN = {
  meeting: "work",
  assignment: "school",
  family_activity: "family",
  meal: "meals",
  workout: "fitness",
  event: "compass",
  class: "school",
} as const;

const KIND_LABEL: Record<ReviewKind, string> = {
  class: "Class",
  meeting: "Meeting",
  assignment: "Assignment",
  family_activity: "Family",
  meal: "Meal",
  workout: "Workout",
  event: "Event",
};

/** Split "MATH 232 Discrete Mathematics" → { code, name }. */
function splitCourseTitle(title: string): { code: string; name: string } {
  const m = title.trim().match(/^([A-Za-z]{2,5}\s?-?\s?\d{2,4}[A-Za-z]?)\s+(.+)$/);
  if (m && m[1] && m[2]) return { code: m[1].replace(/\s+/g, " ").toUpperCase(), name: m[2].trim() };
  return { code: "", name: title.trim() };
}

type Mode = "paste" | "photo" | "voice";
interface ReviewItem extends Omit<ParsedIntent, "kind"> {
  kind: ReviewKind;
  include: boolean;
}

// Minimal shape for the (webkit-prefixed) Web Speech API.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Smart Capture — turn a pasted email, a flyer photo, a PDF, or a spoken
 * brain-dump into scheduled items you can review and add in one tap. Text,
 * voice, and PDFs are read on-device (no API key); photos/screenshots use
 * Claude when a key is configured.
 */
export function SmartCapture({
  title = "Smart capture",
  blurb = "Paste a school email, snap a flyer, or just talk — Vela pulls out the dates and files them for you to confirm.",
}: {
  title?: string;
  blurb?: string;
} = {}) {
  const addFromIntent = useHub((s) => s.addFromIntent);
  const addCourse = useHub((s) => s.addCourse);
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  function reset() {
    setItems(null);
    setError(null);
    setAdded(null);
  }

  async function runText() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    reset();
    // Instant on-device result first, then let the server refine it.
    setItems(extractItems(trimmed).map((i) => ({ ...i, include: true })));
    try {
      const res = await fetch("/api/ai/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data = (await res.json()) as { items: ParsedIntent[] };
        setItems(data.items.map((i) => ({ ...i, include: true })));
      }
    } catch {
      /* on-device result already shown */
    } finally {
      setBusy(false);
    }
  }

  async function runFile(file: File) {
    setBusy(true);
    reset();
    try {
      // PDFs: read the text layer on-device first — private, and works with no
      // API key. Only image-only (scanned) PDFs fall through to the server.
      if (isPdf(file)) {
        let pdfText = "";
        try {
          pdfText = await extractPdfText(file);
        } catch {
          /* couldn't read the text layer — fall through to the server path */
        }
        if (pdfText.length > 20) {
          // Instant on-device result, then let the server refine if a key exists.
          const local = extractItems(pdfText);
          setItems(local.map((i) => ({ ...i, include: true })));
          try {
            const res = await fetch("/api/ai/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: pdfText }),
            });
            if (res.ok) {
              const data = (await res.json()) as { items: ParsedIntent[] };
              setItems(data.items.map((i) => ({ ...i, include: true })));
            }
          } catch {
            /* on-device result already shown */
          }
          if (local.length === 0) {
            setError("Read the PDF, but found nothing schedulable in it.");
          }
          return;
        }
      }

      const data = await fileToBase64(file);
      const res = await fetch("/api/ai/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: { mime: file.type || "application/octet-stream", data } }),
      });
      const payload = (await res.json()) as { items?: ParsedIntent[]; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Couldn't read that file. Try pasting the text instead.");
        return;
      }
      const found = payload.items ?? [];
      setItems(found.map((i) => ({ ...i, include: true })));
      if (found.length === 0) setError("Nothing schedulable found in that file.");
    } catch {
      setError("Couldn't process that file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggleVoice() {
    const SR = getSpeechRecognition();
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    reset();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = text ? text + " " : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r && r[0]) interim += r[0].transcript;
      }
      setText(finalText + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      finalText = "";
    };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  function addSelected() {
    if (!items) return;
    const chosen = items.filter((i) => i.include);
    chosen.forEach((i) => {
      if (i.kind === "class") {
        const { code, name } = splitCourseTitle(i.title);
        addCourse(code || "COURSE", name, 3);
      } else {
        addFromIntent({ kind: i.kind, title: i.title, date: i.date, time: i.time, confidence: i.confidence });
      }
    });
    setAdded(chosen.length);
    setItems(null);
    setText("");
    setTimeout(() => setAdded(null), 4000);
  }

  function patch(idx: number, next: Partial<ReviewItem>) {
    setItems((prev) => prev?.map((it, i) => (i === idx ? { ...it, ...next } : it)) ?? prev);
  }

  const modes: Array<{ id: Mode; label: string; icon: string }> = [
    { id: "paste", label: "Paste", icon: "📋" },
    { id: "photo", label: "Photo / PDF", icon: "📄" },
    ...(voiceSupported ? [{ id: "voice" as const, label: "Dictate", icon: "🎤" }] : []),
  ];

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">text · screenshot · PDF · voice</span>}>
        {title}
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">{blurb}</p>

      <div className="mb-3 flex gap-1.5">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id);
              reset();
            }}
            aria-pressed={mode === m.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-ink/25"
            }`}
          >
            <span aria-hidden>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "photo" ? (
        <div className="flex flex-col items-start gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-ghost text-sm"
          >
            {busy ? "Reading file…" : "📄 Choose a screenshot or PDF"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runFile(f);
            }}
          />
          <span className="text-[11px] text-muted">
            A syllabus PDF, a screenshot of a class schedule, a flyer, or an appointment card.
          </span>
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={mode === "voice" ? 3 : 4}
            placeholder={
              mode === "voice"
                ? "Tap the mic and talk — your words appear here…"
                : "Paste an email or schedule here, e.g.\nField trip Friday Oct 10 at 9am\nProblem Set 6 due next Tuesday\nDentist for Maya on the 15th at 3:45pm"
            }
            className="input min-h-[84px] resize-y text-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            {mode === "voice" ? (
              <button
                onClick={toggleVoice}
                className={`btn ${listening ? "bg-fitness text-white" : "btn-ghost"} !px-3.5 !py-1.5 text-sm`}
              >
                {listening ? "● Stop" : "🎤 Start talking"}
              </button>
            ) : null}
            <button
              onClick={() => void runText()}
              disabled={!text.trim() || busy}
              className="btn-primary !px-4 !py-1.5 text-sm"
            >
              {busy ? "Reading…" : "Extract dates"}
            </button>
            {text ? (
              <button onClick={() => setText("")} className="text-xs text-muted hover:text-ink">
                Clear
              </button>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-xs text-fitness-bright">{error}</p> : null}
      {added !== null ? (
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent">
          Added {added} {added === 1 ? "item" : "items"} to your plan. ✦
        </p>
      ) : null}

      {items ? (
        items.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
            No dates found yet — add a bit more detail and try again.
          </p>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Found {items.length} — uncheck anything you don&apos;t want
            </p>
            <ul className="space-y-1.5">
              {items.map((it, idx) => {
                const style = DOMAIN_STYLES[KIND_TO_DOMAIN[it.kind]];
                return (
                  <li
                    key={idx}
                    className={`rounded-xl border border-line p-2.5 transition-opacity ${
                      it.include ? "" : "opacity-45"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => patch(idx, { include: !it.include })}
                        aria-pressed={it.include}
                        aria-label={it.include ? "Exclude" : "Include"}
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                          it.include ? "border-accent bg-accent text-accent-ink" : "border-ink/25"
                        }`}
                      >
                        {it.include ? (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        ) : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <input
                          value={it.title}
                          onChange={(e) => patch(idx, { title: e.target.value })}
                          className="w-full bg-transparent text-sm font-medium outline-none"
                        />
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <select
                            value={it.kind}
                            onChange={(e) => patch(idx, { kind: e.target.value as ReviewKind })}
                            className={`chip cursor-pointer border-0 ${style.soft} ${style.text}`}
                            aria-label="Type"
                          >
                            {(Object.keys(KIND_LABEL) as ReviewKind[]).map((k) => (
                              <option key={k} value={k}>
                                {KIND_LABEL[k]}
                              </option>
                            ))}
                          </select>
                          {it.kind === "class" ? (
                            <span className="text-[11px] text-school-bright">→ adds to your degree plan</span>
                          ) : (
                            <>
                              <input
                                type="date"
                                value={it.date}
                                onChange={(e) => patch(idx, { date: e.target.value })}
                                className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] text-muted outline-none"
                                aria-label="Date"
                              />
                              <span className="text-[11px] text-muted">
                                {formatFriendly(it.date)}
                                {it.time ? ` · ${formatTime(it.time)}` : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={addSelected} className="btn-primary text-sm" disabled={!items.some((i) => i.include)}>
                Add {items.filter((i) => i.include).length} to my plan
              </button>
              <button onClick={reset} className="text-xs text-muted hover:text-ink">
                Discard
              </button>
            </div>
          </div>
        )
      ) : null}
    </Card>
  );
}
