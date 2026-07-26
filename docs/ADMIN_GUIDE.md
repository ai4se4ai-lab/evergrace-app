# Admin console

Every screen staff can reach, what it does, and the rules it enforces. Sign in at
`/admin/login` (seeded: `admin@evergrace.example` / `EverGrace!Admin1`).

Authorization is checked three times: middleware redirects sessionless requests,
`app/admin/layout.tsx` re-reads the session and rejects non-admins, and **every
admin Server Action calls `requireAdmin()`** — a Server Action is a public
endpoint, so the UI is never the control.

## Sections

| Tab | Route | Purpose |
|---|---|---|
| Reports & Impact | `/admin/reports` | KPIs, signups chart, filterable progress report, PDF export |
| Videos | `/admin/videos` | Catalog, per-video editor, upload, skill levels, PDF export |
| Members | `/admin/users` | Roster, filters, member detail, PDF export |
| Content | `/admin/content` | Journal posts, team, focus areas, instructors |
| Settings | `/admin/settings` | Integration diagnostics, totals, docs index |

## Reports & Impact

Four KPIs (total members, active this week, average progress, 30-day retention
cohort), new-members-per-month for the last 8 months, and the member progress
report.

Filters — name, class/track, plan, age range — are a plain GET form, so the view
is a shareable URL. **Download PDF** opens `/admin/reports/print` with the same
query string, so the export always contains exactly the rows on screen. Print
sheets render on white and always carry the confidentiality footer.

## Members

The roster lists name, age, track, plan, joined, progress, last activity, and
derived status. Clicking a name opens **member detail**: track and the four raw
health answers, recent sessions with progress, subscriptions, saved videos, recent
mood check-ins, and recent notifications.

Member detail is **read-only** — v1 has no destructive member actions (spec
§6.11). Health answers are personal data, so the panel carries the
confidentiality notice; the roster and its PDF are the only export paths.

## Videos

### Catalog
Every video with inline **access level** and **status** selects. Changing status
to *Published* from anything else triggers the notification fan-out and the
toast reports how many members were told. Titles link to the editor.

### Video editor — `/admin/videos/[videoId]`
Three panels:

- **Details** — title, summary, focus area, access, status, duration, master,
  level, intensity, stance, source URL. Plus counters (in progress, saved by,
  notified) and **Delete video**, which states how many member progress records
  will go with it.
- **Roadmap** — chapter and lesson builder. Add, rename, reorder (↑/↓), and
  remove chapters; add and remove lessons. Removing something that members have
  completed says so before you confirm.
- **Transcript** — one `m:ss  text` line per caption, edited as a block. Parsing
  is strict and names the offending line number; a malformed transcript is
  refused rather than partially saved. This is what drives the member-facing
  clickable transcript.

### Upload — `/admin/videos/upload`
With Mux configured: choose a file, the browser uploads straight to Mux, and the
asset-ready webhook publishes the video. Without Mux: paste a source URL. Either
way the row starts as *Processing* and a webhook publishes it, so the publish →
notification path is identical. See [INTEGRATIONS.md](./INTEGRATIONS.md).

### Skill levels — `/admin/videos/levels`
Build the Level 0 → 2 ladder: create, edit, remove, assign videos, reorder.
A video belongs to at most one level, so selecting it here moves it out of any
other level. Removing a level does **not** delete its videos — they are
unassigned, and the remaining levels' badges close up.

## Content

### Journal posts — `/admin/content/blog`
Full CRUD over `/blog`. Body text supports `**bold**` lead-ins; blank lines
separate paragraphs. The slug is generated from the title on publish and then
**left alone on edit**, because it is a public URL and changing it would break
every existing link.

### Team — `/admin/content/team`
CRUD plus ordering for the About page. Initials are derived from the name when
not supplied, so the placeholder avatar always has something to show.

### Focus areas — `/admin/content/categories`
The categories members filter and follow by. Each row shows how many videos and
followers it has. **A focus area with videos cannot be deleted** — `Video`
requires a category, so removing one would orphan them; the console tells you to
reassign first. Duplicate names are refused.

### Instructors — `/admin/content/masters`
Same shape. **An instructor credited on videos cannot be deleted** — the column
is nullable so it *would* succeed, but it would quietly strip the credit from
published sessions, so the console makes it deliberate.

## Settings

Read-only diagnostics: which integrations are live versus running in local mode
(and the concrete consequence of each — "members cannot receive sign-in links
until this is set"), the environment variable names to set, whether `AUTH_SECRET`
and `CRON_SECRET` are present, content totals, and an index of `docs/`.

Nothing here is editable: these are deployment environment variables, and a web
form that changed them would be a foot-gun. **Secret values are never
displayed** — only whether they are set.

## Conventions

- **Destructive actions always confirm**, and the dialog names the collateral
  ("this also removes 4 progress records"). This audience should not lose content
  to a mis-tap.
- **Deletes are refused, not cascaded**, wherever removal would silently change
  what members see.
- **Reordering uses ↑/↓ buttons, not drag-and-drop** — keyboard- and
  touch-operable, which matters more here than the drag affordance. See
  [SPEC_COMPLIANCE.md](./SPEC_COMPLIANCE.md).
- **Every list is a real list** (`role="list"`): Chromium drops list semantics
  from a `<ul>` that is `display: flex`, so the role is declared explicitly.
- Success and failure are announced in `role="status"` / `role="alert"` regions,
  so screen readers hear the outcome.
