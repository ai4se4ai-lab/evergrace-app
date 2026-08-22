# Spec compliance

Section-by-section status against [PROJECT_SPEC.md](./PROJECT_SPEC.md), and every
deviation with its reason. Nothing here is hidden in a footnote: if something is
substituted or missing, it is listed.

## §1 Tech stack

| Spec | Implemented | Note |
|---|---|---|
| Next.js 14+ App Router, TypeScript | ✅ Next 15, TS strict | Server Components default |
| Tailwind + CSS variables | ✅ | Tokens wired through `tailwind.config.ts` |
| shadcn/ui (Radix) | ⚠️ **Radix directly** | Same primitives and accessibility guarantees, hand-styled to the prototype. shadcn is a code generator over Radix; adding its CLI would have meant restyling generated components back to the prototype's look. |
| PostgreSQL 15+ | ✅ | Implemented via Docker Compose (recommended) or local Postgres instance; see [DEPLOYMENT.md](./DEPLOYMENT.md). |
| Prisma + Migrate | ✅ / ⚠️ | Prisma yes; `db push` so far, first migration to be generated before production |
| NextAuth (Auth.js) v5 | ⚠️ **Custom auth** | See below |
| Resend | ⚠️ **SMTP adapter** | `src/lib/mail.ts` sends over SMTP via `nodemailer` instead of the Resend API; console fallback when unset |
| Stripe | ✅ adapter | Checkout + portal + verified webhook; mock provider when unset |
| Mux | ⚠️ partial | Direct upload + webhook implemented; playback uses `<video>`, not Mux Player |
| Server Actions + TanStack Query | ✅ | Query used for bell polling |
| React Hook Form + Zod | ⚠️ | Zod everywhere, shared client/server. Forms use React 19 `useActionState` + Server Actions rather than RHF — fewer moving parts for forms this size. |
| Recharts | ✅ | All three charts |
| Vercel Blob / S3 | ❌ | Placeholder art; `photoUrl` / `thumbnailUrl` columns exist |
| Inngest / Vercel Cron | ⚠️ | Fan-out inline behind one seam; cron route implemented |
| Vitest / Playwright / testing-library | ⚠️ | Vitest 49 tests and Playwright 29 specs passing; no component tests |
| Vercel | ✅ documented | |
| Sentry + Analytics | ❌ | `SENTRY_DSN` read; `error.tsx` is the hook point |

### Why custom auth instead of Auth.js v5

Auth.js's Email provider requires an SMTP/API credential to function at all — a
member could not sign in to the MVP without one. The implementation in
`src/lib/auth.ts` keeps every property the spec asked for:

- Passwordless magic link for members; bcrypt email+password for admins.
- **Database sessions** (not JWTs), so plan and role changes take effect on the
  next request — the explicit reason §6.3 gives for choosing that strategy.
- Single-use, 20-minute tokens; only SHA-256 hashes stored; httpOnly cookies.

It is ~200 lines and verified end-to-end (see [TESTING.md](./TESTING.md)).
Migrating to Auth.js means implementing its adapter interface against the same
tables; `Session` and `MagicLinkToken` are already shaped for it.

## §2 Domain glossary

✅ Every term is named identically in code: `Plan`, `AccessLevel`, `canView`,
`Track`, `Category`, `Master`, `Level`, `Follow`, `VideoStatus`, `MemberStatus`,
with the spec's ordinal ranks. `MemberStatus` is derived, not stored.

## §3 Design tokens

✅ Carried over exactly — light, dark, and high-contrast sets; Baloo 2 + Public
Sans; 16/20/24px root scaling; 44px minimum and 52–64px primary targets; the
documented radius scale; reduced-motion fallbacks. See
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## §4 Data model

✅ Every model present with the spec's fields and relations. Departures: string
columns instead of native Postgres enums (can be promoted; see [DEPLOYMENT.md](./DEPLOYMENT.md)), and additive fields — `passwordHash`,
`preferences`, `Video.slug`/`summary`/`sourceUrl`/`publishedAt`,
`Category.blurb`, `TeamMember.initials`, plus `Session` and `MagicLinkToken`
(implied by `User.sessions` and the magic-link flow). Full table in
[DATA_MODEL.md](./DATA_MODEL.md).

## §5 Route map

✅ Every route implemented. `/api/auth/[...nextauth]` is `/api/auth/callback`,
following from the auth decision. `/api/media/webhook` and
`/api/cron/recompute-status` are additions. Auth boundaries enforced in
middleware **and** re-checked server-side in every admin action.

## §6 Features

| § | Feature | Status |
|---|---|---|
| 6.1 | Landing + carousel (5s autoplay, pause on hover, dots, prev/next, reduced-motion off) | ✅ Also pauses on focus |
| 6.2 | Check-in wizard, server-side scoring, account creation + magic link | ✅ Answers survive account creation in an httpOnly cookie |
| 6.3 | Member magic link, admin credentials, database sessions | ✅ (custom, above) |
| 6.4 | Dashboard: stats, both charts, suggested session, mood, plan card, subscriptions, New for you, My Library | ✅ All from live aggregates |
| 6.5 | Follows across category/master/level, gated to Member+ | ✅ Enforced server-side too |
| 6.6 | Plan modal, Checkout, portal for downgrade, webhook-only plan writes, locked-video banner | ✅ |
| 6.7 | Query-string filters, full metadata before play, progress heartbeat, clickable transcript, syllabus, no playback URL when locked | ✅ Player is `<video>` / simulated clock, not Mux Player |
| 6.8 | Publish fan-out with the prototype's reason strings, bell polling, mark-all-read, 🔒 on locked | ✅ Inline, idempotent |
| 6.9 | KPIs, retention cohort, signups chart, derived status, query-string filters, PDF with confidentiality footer | ⚠️ PDF is a print route, not `@react-pdf` — see below |
| 6.10 | Inline access edit, direct upload, asset-ready webhook, level CRUD + reorder | ⚠️ Reorder is ↑/↓ buttons, not drag-and-drop — see below |
| 6.11 | Roster with full columns, filters, export, no destructive actions | ✅ Plus a read-only member detail screen |

### Admin surface beyond the spec

The spec's route map covers reports, videos (catalog + levels + upload), and the
roster. Those left seven database models with no way for staff to manage them, so
the console also has:

| Screen | Why it was needed |
|---|---|
| `/admin/videos/[videoId]` | No way to edit or delete a video after creation, and `Chapter`, `Lesson`, and `TranscriptLine` had no UI at all — the syllabus and transcript could only be changed by reseeding |
| `/admin/users/[userId]` | Staff supporting a member could see a roster row but not their answers, history, or subscriptions |
| `/admin/content/blog` | `BlogPost` was seed-only; the journal is member-facing content staff should own |
| `/admin/content/team` | `TeamMember` was seed-only |
| `/admin/content/categories`, `/masters` | `Category` and `Master` are the axes members filter and follow by, and were seed-only |
| `/admin/settings` | "Why aren't members getting emails?" had no answer a human could read |

All follow the same rules as the spec'd screens: `requireAdmin()` in every
action, confirmation on destructive actions, and refusal rather than cascade
where a delete would silently change member-facing content.

### PDF export

The spec suggests `@react-pdf/renderer` or Puppeteer against a print route.
`/admin/reports/print` and `/admin/users/print` are that print route: they are
`requireAdmin`-guarded server-rendered sheets that take the same filter query
string, render on white with the confidentiality footer, and open the browser's
print dialog, where "Save as PDF" produces the file. Rows always match the
filtered view because both read `getRoster(filter)`.

Serving a `.pdf` byte stream means adding Puppeteer (a ~300MB Chromium download,
awkward on serverless) or rebuilding the layout in `@react-pdf` primitives. The
print route is the same output through the platform's own PDF engine. If a true
attachment is needed later, point Puppeteer at these existing routes.

### Level reordering

`@dnd-kit` drag-and-drop was replaced with explicit ↑/↓ buttons. For an
interface whose users may have tremor or limited dexterity — and because this is
an accessibility-first product — a keyboard- and touch-operable control is the
better default. Both persist `Level.order` through the same
`reorderLevels` action, so swapping in drag-and-drop later touches only the
component.

## §7 Accessibility

✅ Panel with text size, high contrast, read-aloud, and light/dark/auto;
preferences persisted per-user **and** in a cookie for anonymous visitors; 44px+
targets; full keyboard navigation with a visible `--accent` focus ring;
reduced-motion honoured; colour never the only signal; AA/AAA contrast targets.
Details and a verification checklist in [ACCESSIBILITY.md](./ACCESSIBILITY.md).

Not yet: automated axe-core assertions.

## §8 Build order

Followed, with steps 1–10 complete: accessibility is implemented, manually
verified, and partly covered by the passing Playwright suite (no axe-core yet).
Step 11 is partial: empty states, scoped loading skeletons, error boundary, and
`not-found` exist; Sentry and analytics do not.

## §9 Environment variables

✅ All present in `.env.example`, plus `APP_URL`, `AUTH_SECRET` (replacing
`NEXTAUTH_*`), and `CRON_SECRET`.

## §10 Out of scope

Respected — responsive web only, on-demand video only, English only, no
user-to-user messaging.

## Summary of every deviation

| Deviation | Reason | Effort to close |
|---|---|---|
| PostgreSQL required | Already implemented | N/A — spec requirement met |
| String columns instead of enums | Optional; can promote to native Postgres enums | Low — see [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Custom auth instead of Auth.js v5 | Auth.js Email provider needs credentials to work at all | Medium |
| Radix directly instead of shadcn/ui | Same primitives; avoids restyling generated code | Low, cosmetic |
| `useActionState` instead of React Hook Form | Simpler for forms this size; Zod still shared | Low |
| `<video>` instead of Mux Player | No Mux credentials; keeps playback functional locally | Low — swap one element |
| Print route instead of a PDF byte stream | Avoids Puppeteer on serverless; identical output | Medium |
| ↑/↓ instead of drag-and-drop | Better for the target users | Low |
| Inline fan-out instead of Inngest | Correct and fast at MVP scale; one seam to move it | Low |
| No Blob storage | Placeholder art; columns ready | Medium |
| Sentry not wired | Hook point in place | Low |
| No component tests | Time; e2e covers the same behaviour end-to-end | Medium |
