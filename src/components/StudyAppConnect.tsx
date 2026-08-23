"use client";

import { useRef, useState } from "react";
import { Card, SectionTitle } from "./ui";
import { useHub } from "@/core/store/hub";
import { parseStudyExport, toRawUrl, type ParseResult } from "@/core/integrations/studyImport";

/**
 * Link Vela to a separate study app. The study app publishes a small classes
 * JSON (see the contract in studyImport.ts) — paste its URL to pull on demand,
 * or import a file it exports. Classes become Courses; assignments and exams
 * become dated Assignments that flow into the agenda, timeline, and reminders.
 */
export function StudyAppConnect() {
  const savedUrl = useHub((s) => s.studyAppUrl);
  const setStudyAppUrl = useHub((s) => s.setStudyAppUrl);
  const importStudyClasses = useHub((s) => s.importStudyClasses);
  const courses = useHub((s) => s.courses);

  const [url, setUrl] = useState(savedUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingCodes = new Set(courses.map((c) => c.code.toLowerCase()));

  function loadFrom(text: string, sourceUrl?: string) {
    setError(null);
    setStatus(null);
    try {
      const result = parseStudyExport(text);
      setPreview(result);
      if (sourceUrl) setStudyAppUrl(sourceUrl);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Couldn't read that data.");
    }
  }

  async function pull() {
    const target = toRawUrl(url);
    if (!target) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(target, { headers: { Accept: "application/json, text/plain" } });
      if (!res.ok) throw new Error(`The link returned ${res.status}. Is the file public?`);
      loadFrom(await res.text(), url);
    } catch (e) {
      setError(
        e instanceof Error && /Failed to fetch/.test(e.message)
          ? "Couldn't reach that link (it may be private or block cross-origin access). Try exporting the file and importing it below."
          : e instanceof Error
            ? e.message
            : "Couldn't pull from that link.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    loadFrom(await file.text());
    if (fileRef.current) fileRef.current.value = "";
  }

  function confirmImport() {
    if (!preview) return;
    const { courses: c, items } = importStudyClasses(preview.classes);
    setPreview(null);
    setStatus(
      c === 0 && items === 0
        ? "Already up to date — nothing new to add."
        : `Imported ${c} class${c === 1 ? "" : "es"} and ${items} assignment${items === 1 ? "" : "s"} ✓`,
    );
    setTimeout(() => setStatus(null), 6000);
  }

  const newClasses = preview
    ? preview.classes.filter((cl) => !existingCodes.has((cl.code || "").toLowerCase())).length
    : 0;

  return (
    <Card>
      <SectionTitle right={savedUrl ? <span className="text-xs text-muted">linked</span> : undefined}>
        Link your study app
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-muted">
        Pull your classes, assignments, and exams from your study app. Paste the link to its
        published <span className="font-mono">classes.json</span> (e.g. a raw GitHub file), or import
        a file it exports — they land here as courses and dated deadlines.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://raw.githubusercontent.com/…/classes.json"
          className="input min-w-[180px] flex-1 !py-1.5 text-xs"
          aria-label="Study app classes URL"
        />
        <button onClick={pull} disabled={busy || !url.trim()} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
          {busy ? "Pulling…" : savedUrl && savedUrl === url ? "Re-pull" : "Pull"}
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs">
          Import file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
      </div>

      {preview ? (
        <div className="animate-slide-in mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
          <p className="text-xs font-semibold">
            ✨ Found {preview.classCount} class{preview.classCount === 1 ? "" : "es"} · {preview.itemCount} assignment
            {preview.itemCount === 1 ? "" : "s"}/exams
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {newClasses} new class{newClasses === 1 ? "" : "es"}; duplicates are skipped.
          </p>
          <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs">
            {preview.classes.slice(0, 12).map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-[11px] text-muted">{c.code}</span>{" "}
                  <span className="font-medium">{c.name}</span>
                </span>
                <span className="shrink-0 text-[11px] text-muted">
                  {(c.assignments?.length ?? 0) + (c.exams?.length ?? 0)} items
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={confirmImport} className="btn-primary !px-3 !py-1 text-xs">
              Import into Vela
            </button>
            <button onClick={() => setPreview(null)} className="text-[11px] text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {status ? <p className="mt-2 text-xs text-meals-bright">{status}</p> : null}
      {error ? <p className="mt-2 text-xs text-fitness-bright">{error}</p> : null}
    </Card>
  );
}
