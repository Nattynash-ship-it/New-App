"use client";

import { useState } from "react";
import { Attachments } from "@/components/Attachments";
import { MicButton } from "@/components/MicButton";
import { Card, EmptyState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { formatFriendly } from "@/core/dates";
import { useHub, useHydrated } from "@/core/store/hub";
import type { Note } from "@/core/types";

function DocumentsVault() {
  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-muted">private · on this device</span>}>
        Documents vault
      </SectionTitle>
      <p className="-mt-1 text-xs text-muted">
        Insurance cards, school forms, appliance manuals, medical records — one calm place, stored
        privately on your device.
      </p>
      <Attachments ownerType="general" ownerId="vault" label="Files" />
    </Card>
  );
}

/** "school, kids" → ["school", "kids"] — trimmed, lowercased, deduped. */
function parseTags(raw: string): string[] {
  return [...new Set(raw.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

function NoteCard({ note }: { note: Note }) {
  const updateNote = useHub((s) => s.updateNote);
  const removeNote = useHub((s) => s.removeNote);
  const togglePinNote = useHub((s) => s.togglePinNote);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tags, setTags] = useState((note.tags ?? []).join(", "));

  function save() {
    updateNote(note.id, {
      title: title.trim() || "Untitled note",
      body: body.trim(),
      tags: parseTags(tags),
    });
    setEditing(false);
  }

  return (
    <div className="card p-4">
      {editing ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input !py-1.5 text-sm font-semibold"
            placeholder="Title"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="input resize-y text-sm"
            placeholder="Write it down…"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input !py-1.5 text-xs"
            placeholder="Tags, comma-separated (school, kids, ideas)"
            aria-label="Tags"
          />
          <div className="flex items-center gap-2">
            <button onClick={save} className="btn-primary !px-3 !py-1.5 text-xs">
              Save
            </button>
            <button
              onClick={() => {
                setTitle(note.title);
                setBody(note.body);
                setTags((note.tags ?? []).join(", "));
                setEditing(false);
              }}
              className="text-xs text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              {note.pinned ? <span className="text-accent" aria-label="Pinned">📌</span> : null}
              {note.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1 text-muted">
              <button
                onClick={() => togglePinNote(note.id)}
                aria-label={note.pinned ? "Unpin" : "Pin"}
                title={note.pinned ? "Unpin" : "Pin"}
                className={`rounded-full px-1.5 text-xs transition-colors hover:text-accent ${note.pinned ? "text-accent" : ""}`}
              >
                {note.pinned ? "★" : "☆"}
              </button>
              <button
                onClick={() => setEditing(true)}
                aria-label="Edit note"
                className="rounded-full px-1.5 text-xs hover:text-ink"
              >
                ✎
              </button>
              <button
                onClick={() => removeNote(note.id)}
                aria-label="Delete note"
                className="rounded-full px-1.5 text-xs hover:text-fitness-bright"
              >
                ×
              </button>
            </div>
          </div>
          {note.body ? (
            <p className="whitespace-pre-wrap text-sm text-muted">{note.body}</p>
          ) : (
            <p className="text-sm italic text-muted/70">Empty — tap ✎ to add details.</p>
          )}
          {note.tags && note.tags.length > 0 ? (
            <p className="mt-2 flex flex-wrap gap-1">
              {note.tags.map((t) => (
                <span key={t} className="chip bg-accent-soft !text-[10px] text-accent">
                  #{t}
                </span>
              ))}
            </p>
          ) : null}
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted/70">
            Updated {formatFriendly(note.updatedAt.slice(0, 10))}
          </p>
        </>
      )}
    </div>
  );
}

function AddNote() {
  const addNote = useHub((s) => s.addNote);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full border-dashed py-3 text-sm">
        ＋ New note
      </button>
    );
  }

  return (
    <form
      className="card space-y-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() && !body.trim()) return;
        addNote(title, body);
        setTitle("");
        setBody("");
        setOpen(false);
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Field trip permission)"
        className="input !py-1.5 text-sm font-semibold"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Write it down…"
        className="input resize-y text-sm"
      />
      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs" disabled={!title.trim() && !body.trim()}>
          Save note
        </button>
        <MicButton value={body} onChange={setBody} />
        <span className="text-[11px] text-muted">dictate the note</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function NotesPage() {
  const hydrated = useHydrated();
  const notes = useHub((s) => s.notes);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  if (!hydrated) return <Skeleton />;

  const allTags = [...new Set(notes.flatMap((n) => n.tags ?? []))].sort();
  const visible = tagFilter ? notes.filter((n) => n.tags?.includes(tagFilter)) : notes;
  const sorted = [...visible].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Notes & Documents"
        title="Your family brain"
        subtitle="The one place for the things you keep meaning to remember — notes, lists, and important files."
      />

      <DocumentsVault />

      <div className="space-y-3">
        <SectionTitle right={<span className="text-xs text-muted">{notes.length} saved</span>}>
          Notes & journal
        </SectionTitle>
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTagFilter(null)}
              aria-pressed={tagFilter === null}
              className={`chip !text-[11px] ${tagFilter === null ? "bg-accent-soft text-accent" : "border border-line text-muted"}`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
                aria-pressed={tagFilter === t}
                className={`chip !text-[11px] ${tagFilter === t ? "bg-accent-soft text-accent" : "border border-line text-muted"}`}
              >
                #{t}
              </button>
            ))}
          </div>
        ) : null}
        <AddNote />
        {sorted.length === 0 ? (
          <EmptyState>No notes yet — jot down anything you don&apos;t want to hold in your head.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sorted.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
