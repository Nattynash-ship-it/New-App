"use client";

import { useRef, useState } from "react";
import { newId, useHub } from "@/core/store/hub";
import { deleteFile, getFileURL, putFile } from "@/lib/fileStore";
import { extractFromFile } from "@/core/ai/autoExtract";
import { formatFriendly } from "@/core/dates";
import type { ParsedCourse } from "@/core/nlp/courses";
import type { AttachmentOwner, ParsedIntent } from "@/core/types";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file
const DEFAULT_ACCEPT = "application/pdf,image/*,.doc,.docx,.txt";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string): string {
  if (mime === "application/pdf") return "📄";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.includes("word") || mime.includes("doc")) return "📝";
  return "📎";
}

interface ClassRow extends ParsedCourse {
  include: boolean;
}
interface ItemRow extends ParsedIntent {
  include: boolean;
}
interface Findings {
  fileName: string;
  classes: ClassRow[];
  items: ItemRow[];
  note?: string;
}

/**
 * Drop-in "upload a file to this section" widget. Metadata goes in the store;
 * bytes go to on-device blob storage. Every upload is also mined on the spot —
 * classes and dates found inside are offered for one-tap adding, so uploading
 * a transcript or schedule actually DOES something. Reused across courses,
 * units, projects, and the documents vault — pass the owner it belongs to.
 */
export function Attachments({
  ownerType,
  ownerId,
  label = "Files",
  accept = DEFAULT_ACCEPT,
}: {
  ownerType: AttachmentOwner;
  ownerId: string;
  label?: string;
  accept?: string;
}) {
  const attachments = useHub((s) => s.attachments).filter(
    (a) => a.ownerType === ownerType && a.ownerId === ownerId,
  );
  const addAttachment = useHub((s) => s.addAttachment);
  const removeAttachment = useHub((s) => s.removeAttachment);
  const addCourse = useHub((s) => s.addCourse);
  const addFromIntent = useHub((s) => s.addFromIntent);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Findings | null>(null);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setFindings(null);
    setAddedMsg(null);
    setBusy(true);
    try {
      const merged: Findings = { fileName: "", classes: [], items: [] };
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          setError(`"${file.name}" is over 25 MB — too large to store on-device.`);
          continue;
        }
        const id = newId("att");
        await putFile(id, file);
        addAttachment({
          id,
          ownerType,
          ownerId,
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          addedAt: new Date().toISOString(),
        });
        // Mine the file for classes + dates right away.
        const found = await extractFromFile(file);
        merged.fileName = merged.fileName || found.fileName;
        merged.classes.push(...found.classes.map((c) => ({ ...c, include: true })));
        merged.items.push(...found.items.map((i) => ({ ...i, include: true })));
        if (found.note && !merged.note) merged.note = found.note;
      }
      if (merged.classes.length > 0 || merged.items.length > 0 || merged.note) {
        setFindings(merged);
      }
    } catch {
      setError("Couldn't save the file. Your browser may block on-device storage in private mode.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function open(id: string) {
    const url = await getFileURL(id);
    if (!url) {
      setError("That file isn't on this device — it may have been uploaded elsewhere.");
      return;
    }
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function remove(id: string) {
    await deleteFile(id);
    removeAttachment(id);
  }

  function addSelected() {
    if (!findings) return;
    const classes = findings.classes.filter((c) => c.include && c.name.trim());
    const items = findings.items.filter((i) => i.include);
    classes.forEach((c) =>
      addCourse(c.code.trim() || "COURSE", c.name.trim(), c.credits, c.completed ?? false),
    );
    items.forEach((i) =>
      addFromIntent({ kind: i.kind, title: i.title, date: i.date, time: i.time, confidence: i.confidence }),
    );
    const parts = [
      classes.length ? `${classes.length} ${classes.length === 1 ? "class" : "classes"}` : "",
      items.length ? `${items.length} ${items.length === 1 ? "date" : "dates"}` : "",
    ].filter(Boolean);
    setAddedMsg(parts.length ? `Added ${parts.join(" & ")} ✓` : null);
    setFindings(null);
    setTimeout(() => setAddedMsg(null), 5000);
  }

  function patchClass(idx: number, include: boolean) {
    setFindings((f) =>
      f ? { ...f, classes: f.classes.map((c, i) => (i === idx ? { ...c, include } : c)) } : f,
    );
  }
  function patchItem(idx: number, include: boolean) {
    setFindings((f) =>
      f ? { ...f, items: f.items.map((it, i) => (i === idx ? { ...it, include } : it)) } : f,
    );
  }

  const selectedCount = findings
    ? findings.classes.filter((c) => c.include).length + findings.items.filter((i) => i.include).length
    : 0;

  return (
    <div className="mt-3 rounded-xl border border-dashed border-line p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
          {attachments.length ? ` · ${attachments.length}` : ""}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-ghost !px-2.5 !py-1 text-xs"
        >
          {busy ? "Reading…" : "＋ Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {attachments.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="group flex items-center justify-between gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-xs"
            >
              <button
                onClick={() => open(a.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                title={`Open ${a.name}`}
              >
                <span aria-hidden>{fileIcon(a.mime)}</span>
                <span className="min-w-0 truncate font-medium hover:text-accent">{a.name}</span>
                <span className="shrink-0 text-muted">{humanSize(a.size)}</span>
              </button>
              <button
                onClick={() => remove(a.id)}
                aria-label={`Remove ${a.name}`}
                className="shrink-0 rounded-full px-1.5 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[11px] text-muted">
          Drop in a PDF, image, or doc — stored privately on this device, and anything useful inside
          (classes, due dates) is offered for adding.
        </p>
      )}

      {addedMsg ? <p className="mt-1.5 text-[11px] text-meals-bright">{addedMsg}</p> : null}

      {findings ? (
        <div className="animate-slide-in mt-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-2.5">
          <p className="text-[11px] font-semibold">
            ✨ Found in {findings.fileName || "your upload"}
            {findings.classes.length || findings.items.length
              ? ` — ${[
                  findings.classes.length
                    ? `${findings.classes.length} ${findings.classes.length === 1 ? "class" : "classes"}`
                    : "",
                  findings.items.length
                    ? `${findings.items.length} ${findings.items.length === 1 ? "date" : "dates"}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}`
              : ""}
          </p>
          {findings.note ? <p className="mt-1 text-[11px] text-muted">{findings.note}</p> : null}

          {findings.classes.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {findings.classes.map((c, i) => (
                <li key={`c${i}`} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={c.include}
                    onChange={(e) => patchClass(i, e.target.checked)}
                    aria-label={`Include ${c.name}`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono text-[11px] text-muted">{c.code}</span>{" "}
                    <span className="font-medium">{c.name}</span>
                  </span>
                  <span className={`chip shrink-0 !text-[10px] ${c.completed ? "bg-school-soft text-school-bright" : "border border-line text-muted"}`}>
                    {c.completed ? "✓ done" : "in progress"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {findings.items.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {findings.items.map((it, i) => (
                <li key={`i${i}`} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={it.include}
                    onChange={(e) => patchItem(i, e.target.checked)}
                    aria-label={`Include ${it.title}`}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{it.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">{formatFriendly(it.date)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {findings.classes.length > 0 || findings.items.length > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <button onClick={addSelected} disabled={selectedCount === 0} className="btn-primary !px-3 !py-1 text-xs">
                Add {selectedCount} selected
              </button>
              <button onClick={() => setFindings(null)} className="text-[11px] text-muted hover:text-ink">
                Dismiss
              </button>
            </div>
          ) : (
            <button onClick={() => setFindings(null)} className="mt-1.5 text-[11px] text-muted hover:text-ink">
              Dismiss
            </button>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-1.5 text-[11px] text-fitness-bright">{error}</p> : null}
    </div>
  );
}
