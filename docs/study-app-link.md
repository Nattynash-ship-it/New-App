# Linking a study app to Vela

Vela can pull your classes, assignments, and exams from a separate **study app**.
Both apps are local-first (no shared server), so the bridge is a small JSON file
the study app publishes and Vela pulls — no backend required.

## How it works

1. The study app writes a `classes.json` following the contract below.
2. It publishes that file somewhere Vela can read it — the simplest is a **public
   GitHub repo**, then use the file's **raw** URL:
   `https://raw.githubusercontent.com/<user>/<repo>/<branch>/data/classes.json`
   (Vela also auto-converts a normal `github.com/.../blob/...` link to raw.)
3. In Vela: **School → Link your study app** → paste the URL → **Pull**.
   No public URL? Export the file from the study app and use **Import file** instead.
4. Vela shows a preview, then merges: each class becomes a **Course**, and each
   assignment/exam becomes a dated **Assignment** that flows into the "Everything"
   agenda, the timeline, and reminders (incl. calendar `.ics`). Re-pulling is safe —
   duplicates (same title + date) are skipped.

## The contract (`classes.json`)

```json
{
  "source": "study-app",
  "version": 1,
  "classes": [
    {
      "code": "D278",
      "name": "Scripting and Programming Foundations",
      "credits": 3,
      "completed": false,
      "assignments": [
        { "title": "Project 1", "dueDate": "2026-09-15", "dueTime": "23:59", "done": false }
      ],
      "exams": [
        { "title": "Objective Assessment", "date": "2026-10-01", "time": "14:00" }
      ]
    }
  ]
}
```

- Required per class: `code` (or `name`). Everything else is optional.
- The parser is tolerant: `courses` works for `classes`, `title` for `name`,
  and `due`/`date` for `dueDate`. Dates are `YYYY-MM-DD`; times are `HH:MM` (24h).

That's all the study app needs to emit. Vela owns the reading side.
