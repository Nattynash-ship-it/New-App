"use client";

import { useRef, useState } from "react";
import { Card, SectionTitle } from "./ui";
import { MicButton } from "./MicButton";
import { parseCourses, type ParsedCourse } from "@/core/nlp/courses";
import { extractPdfText, isPdf } from "@/core/ai/readFile";
import { useHub } from "@/core/store/hub";

type Mode = "paste" | "file";
interface Row extends ParsedCourse {
  include: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/**
 * Add your classes from a transcript — paste the text or upload a transcript
 * PDF (both read on-device, no API key). Screenshots are read by Claude when a
 * key is configured. Review the detected classes, then add them in one tap.
 */
export function ClassImporter() {
  const addCourse = useHub((s) => s.addCourse);
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function show(courses: ParsedCourse[]) {
    setRows(courses.map((c) => ({ ...c, include: true })));
    if (courses.length === 0) setError("No classes found — check the text or add them manually below.");
  }

  function runPaste() {
    setError(null);
    setAdded(null);
    show(parseCourses(text));
  }

  async function runFile(file: File) {
    setBusy(true);
    setError(null);
    setAdded(null);
    setRows(null);
    try {
      // PDFs: read the text layer on-device first — private, no API key needed.
      if (isPdf(file)) {
        let pdfText = "";
        try {
          pdfText = await extractPdfText(file);
        } catch {
          /* no readable text layer — fall through to the server path */
        }
        if (pdfText.length > 20) {
          show(parseCourses(pdfText));
          return;
        }
      }

      const data = await fileToBase64(file);
      const res = await fetch("/api/ai/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: { mime: file.type || "application/octet-stream", data } }),
      });
      const payload = (await res.json()) as { courses?: ParsedCourse[]; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Couldn't read that file. Paste the text instead.");
        return;
      }
      show(payload.courses ?? []);
    } catch {
      setError("Couldn't process that file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addSelected() {
    if (!rows) return;
    const chosen = rows.filter((r) => r.include && r.name.trim());
    chosen.forEach((r) => addCourse(r.code.trim() || "COURSE", r.name.trim(), r.credits));
    setAdded(chosen.length);
    setRows(null);
    setText("");
    setTimeout(() => setAdded(null), 4000);
  }

  function patch(i: number, next: Partial<Row>) {
    setRows((prev) => prev?.map((r, idx) => (idx === i ? { ...r, ...next } : r)) ?? prev);
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">paste · PDF · screenshot</span>}>
        Add classes from your transcript
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Paste your transcript or class list, or upload a transcript PDF / screenshot — Vela pulls out
        your classes for you to confirm.
      </p>

      <div className="mb-3 flex gap-1.5">
        {(["paste", "file"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setRows(null);
              setError(null);
            }}
            aria-pressed={mode === m}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-ink/25"
            }`}
          >
            {m === "paste" ? "📋 Paste" : "📄 PDF / screenshot"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <div className="flex flex-col items-start gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost text-sm">
            {busy ? "Reading…" : "📄 Choose a transcript PDF or screenshot"}
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
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={"Paste transcript lines, e.g.\nMATH 232  Discrete Mathematics  4  A\nCS 310  Data Structures & Algorithms  4  In Progress"}
            className="input min-h-[84px] resize-y text-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={runPaste} disabled={!text.trim()} className="btn-primary !px-4 !py-1.5 text-sm">
              Find my classes
            </button>
            <MicButton value={text} onChange={setText} />
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-xs text-fitness-bright">{error}</p> : null}
      {added !== null ? (
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent">
          Added {added} {added === 1 ? "class" : "classes"} to your degree. ✦
        </p>
      ) : null}

      {rows && rows.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Found {rows.length} — edit or uncheck, then add
          </p>
          <ul className="space-y-1.5">
            {rows.map((r, i) => (
              <li
                key={i}
                className={`flex flex-wrap items-center gap-2 rounded-xl border border-line p-2 ${r.include ? "" : "opacity-45"}`}
              >
                <button
                  onClick={() => patch(i, { include: !r.include })}
                  aria-pressed={r.include}
                  aria-label={r.include ? "Exclude" : "Include"}
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border ${
                    r.include ? "border-accent bg-accent text-accent-ink" : "border-ink/25"
                  }`}
                >
                  {r.include ? "✓" : ""}
                </button>
                <input
                  value={r.code}
                  onChange={(e) => patch(i, { code: e.target.value })}
                  className="input !w-24 !py-1 text-xs font-mono"
                  aria-label="Code"
                />
                <input
                  value={r.name}
                  onChange={(e) => patch(i, { name: e.target.value })}
                  className="input min-w-[140px] flex-1 !py-1 text-sm"
                  aria-label="Name"
                />
                <label className="flex items-center gap-1 text-[11px] text-muted">
                  cr
                  <input
                    type="number"
                    min={1}
                    max={9}
                    value={r.credits}
                    onChange={(e) => patch(i, { credits: Math.max(1, Number(e.target.value) || 3) })}
                    className="input !w-14 !py-1 text-xs"
                    aria-label="Credits"
                  />
                </label>
              </li>
            ))}
          </ul>
          <button onClick={addSelected} className="btn-primary mt-3 text-sm" disabled={!rows.some((r) => r.include)}>
            Add {rows.filter((r) => r.include).length} classes
          </button>
        </div>
      ) : null}
    </Card>
  );
}
