"use client";

import { useRef, useState } from "react";
import { newId, useHub } from "@/core/store/hub";
import { deleteFile, getFileURL, putFile } from "@/lib/fileStore";
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

/**
 * Drop-in "upload a file to this section" widget. Metadata goes in the store;
 * bytes go to on-device blob storage. Reused across courses, units, projects,
 * and the documents vault — pass the owner it belongs to.
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
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
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
          {busy ? "Uploading…" : "＋ Upload"}
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
          Drop in a PDF, image, or doc — stored privately on this device.
        </p>
      )}

      {error ? <p className="mt-1.5 text-[11px] text-fitness-bright">{error}</p> : null}
    </div>
  );
}
