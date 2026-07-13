"use client";

import { useRef, useState } from "react";
import { newId, useHub } from "@/core/store/hub";
import { deleteFile, getFile, getFileURL, putFile } from "@/lib/fileStore";
import { extractFromFile } from "@/core/ai/autoExtract";
import { ExtractionReview, type Findings } from "./ExtractionReview";
import type { AttachmentOwner } from "@/core/types";

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

/** Roll one file's extraction into an accumulating Findings object. */
function mergeFindings(into: Findings, name: string, found: Awaited<ReturnType<typeof extractFromFile>>) {
  into.fileName = into.fileName || found.fileName || name;
  into.classes.push(...found.classes.map((c) => ({ ...c, include: true })));
  into.items.push(...found.items.map((i) => ({ ...i, include: true })));
  if (found.note && !into.note) into.note = found.note;
}

/**
 * Drop-in "upload a file to this section" widget. Metadata goes in the store;
 * bytes go to on-device blob storage. Every upload is mined on the spot, and
 * every already-uploaded file gets an "✨ Extract" button to re-run it — so
 * classes and dates inside any attachment can always be pulled out. Reused
 * across courses, units, projects, and the documents vault.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Findings | null>(null);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  function flash(msg: string | null) {
    setAddedMsg(msg);
    if (msg) setTimeout(() => setAddedMsg(null), 5000);
  }

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
        mergeFindings(merged, file.name, await extractFromFile(file));
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

  async function reExtract(id: string) {
    setError(null);
    setFindings(null);
    setAddedMsg(null);
    setExtractingId(id);
    try {
      const file = await getFile(id);
      if (!file) {
        setError("That file isn't on this device anymore.");
        return;
      }
      const merged: Findings = { fileName: "", classes: [], items: [] };
      mergeFindings(merged, file.name, await extractFromFile(file));
      if (merged.classes.length === 0 && merged.items.length === 0 && !merged.note) {
        merged.note = "Nothing to pull out of this file.";
      }
      setFindings(merged);
    } catch {
      setError("Couldn't read that file to extract from it.");
    } finally {
      setExtractingId(null);
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
              <span className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => reExtract(a.id)}
                  disabled={extractingId === a.id}
                  className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent-soft disabled:opacity-50"
                  title="Pull classes & dates out of this file"
                >
                  {extractingId === a.id ? "…" : "✨ Extract"}
                </button>
                <button
                  onClick={() => remove(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="rounded-full px-1.5 text-muted opacity-0 transition-opacity hover:text-fitness-bright group-hover:opacity-100"
                >
                  ×
                </button>
              </span>
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
        <ExtractionReview
          findings={findings}
          onDone={(msg) => {
            setFindings(null);
            flash(msg);
          }}
        />
      ) : null}

      {error ? <p className="mt-1.5 text-[11px] text-fitness-bright">{error}</p> : null}
    </div>
  );
}
