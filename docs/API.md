# API and Server Actions

Mutations are Server Actions by default. Route Handlers exist where an external
caller or a browser primitive needs a URL. The spec's route map (§5) lists
`/api/checkin`, `/api/mood`, and `/api/follow`; those exist and wrap the same
actions, so both entry styles are available.

## Authentication

| Route | Method | Auth | Behaviour |
|---|---|---|---|
| `/api/auth/callback?token=` | GET | none | Consumes a magic-link token, sets an httpOnly session cookie, redirects to `/dashboard` (or `/onboarding` if the member has no track). Invalid, expired, or already-used tokens redirect to `/login?error=expired`. |

Tokens are single-use with a 20-minute expiry. Only a SHA-256 hash is stored.

### Actions

| Action | Notes |
|---|---|
| `requestMagicLink(email)` | Creates the token and sends the email. In local mode returns `devUrl` so sign-in works with no mailbox. Never reveals whether the address exists. |
| `adminSignIn(email, password)` | bcrypt. Compares against a dummy hash for unknown or non-admin accounts so response timing doesn't reveal which emails are staff. One generic error message. |
| `signOut()` | Deletes the session row and clears the cookie. |

## Member endpoints

| Route | Method | Auth | Body |
|---|---|---|---|
| `/api/notifications` | GET | member | — → `{ items, unread }`, `Cache-Control: no-store`. Polled every 60s by the bell. |
| `/api/notifications` | PATCH | member | — → marks all read, returns the fresh payload |
| `/api/progress` | PATCH / POST | member | `{ videoId, secondsWatched }`. Accepts `keepalive`/`sendBeacon`. |
| `/api/checkin` | POST | optional | `{ mobility, surgery, dizzy, joints }` → `{ ok, track }`. Track computed server-side. |
| `/api/mood` | POST | member | `{ score: 1..5 }` |
| `/api/follow` | POST / DELETE | member | `{ kind: CATEGORY\|MASTER\|LEVEL, targetId }`. Toggles; 403 for Basic. |

### Actions (`src/actions/`)

| Action | Guard | Effect |
|---|---|---|
| `submitHealthCheckIn` | optional | Scores the answers. Signed in → persists; anonymous → stashes in a 2-hour httpOnly cookie. |
| `createAccountFromCheckIn` | none | Creates the account with the stashed answers and sends the magic link. |
| `toggleFollow` | member + `canFollow` | Creates/deletes a `Follow` |
| `recordMood` | member | Appends a `MoodCheckIn`, touches `lastActiveAt` |
| `toggleSavedVideo` | member | `SavedVideo` for a My Library tab |
| `recordProgress` | member | Upsert, monotonic |
| `setLessonComplete` | member | `LessonCompletion` |
| `markNotificationsRead` | member | Bulk update |
| `savePreferences` | optional | Cookie always; `User.preferences` when signed in |
| `startPlanChange` | member | Redirects to Checkout, or the billing portal for a downgrade |
| `confirmMockPlanChange` | member | Local billing only; throws if Stripe is configured |

## Admin actions

All call `requireAdmin()` first — a Server Action is a public endpoint, so
middleware is never the authorization.

| Action | Effect |
|---|---|
| `setVideoAccess` | Changes `access`; revalidates the admin, library, and dashboard views |
| `setVideoStatus` | Changes `status`. Entering `PUBLISHED` from any other status triggers the fan-out and reports how many members were notified. |
| `requestUploadTarget` | Mux direct-upload URL, or a local correlation id |
| `createVideo` | Creates the row as `PROCESSING`; the asset-ready webhook publishes it. Appends a suffix on slug collision. |
| `saveLevel` | Creates/updates a level and reassigns its videos (a video belongs to one level) |
| `deleteLevel` | Nulls `Video.levelId`, deletes the level, closes the gap in `order` |
| `reorderLevels` | Rewrites `order` from an id list |

### `src/actions/admin-video.ts` — the video editor

| Action | Effect |
|---|---|
| `updateVideo` | Full metadata edit. Entering `PUBLISHED` triggers the fan-out, same as `setVideoStatus`. |
| `deleteVideo` | Deletes the video and everything cascading from it; reports how many progress records go with it |
| `saveChapter` / `deleteChapter` / `moveChapter` | Syllabus chapters; deletes and moves resequence `order` in a transaction |
| `saveLesson` / `deleteLesson` | Lessons within a chapter |
| `saveTranscript` | Replaces the transcript from `m:ss  text` lines. Parsing lives in `lib/transcript.ts` (unit-tested) and **refuses** a malformed block, naming the line — a silently dropped caption is worse than an error. |

### `src/actions/admin-content.ts` — reference and marketing data

| Action | Effect |
|---|---|
| `saveCategory` / `deleteCategory` | Focus areas. Duplicate names refused; **delete refused while videos reference it**, since `Video.categoryId` is required. |
| `saveMaster` / `deleteMaster` | Instructors. **Delete refused while credited on videos** — the column is nullable, so it would otherwise silently strip credits. |
| `saveBlogPost` / `deleteBlogPost` | Journal posts. Slug generated on create and **frozen on edit**, because it is a public URL. |
| `saveTeamMember` / `deleteTeamMember` / `reorderTeam` | About-page team; initials derived from the name when omitted |

Reordering and resequencing use `prisma.$transaction`, never `Promise.all`:
concurrent writes contend on SQLite, and a half-applied reorder would corrupt
`order`.

## Webhooks

### `POST /api/stripe/webhook`

The only path that grants or revokes a paid plan. Verifies Stripe's
`t=…,v1=…` signature with HMAC-SHA256 and `timingSafeEqual`, and rejects
payloads older than five minutes to blunt replay. Handles
`checkout.session.completed`, `customer.subscription.updated` (a non-active
subscription drops to `BASIC`), and `customer.subscription.deleted`. Unknown
event types are acknowledged so Stripe stops retrying. Returns 503 when Stripe
is not configured.

### `POST /api/mux/webhook`

On `video.asset.ready`: stores `muxPlaybackId` and the thumbnail, sets
`PUBLISHED`, stamps `publishedAt`, and fans out notifications. Signature
verified when `MUX_WEBHOOK_SECRET` is set. Returns 503 when Mux is not
configured.

### `POST /api/media/webhook` (local stand-in)

Same contract and same side effects, so the publish path is exercisable without
Mux. Requires the `x-cron-secret` header. Returns 409 when Mux *is* configured,
so the two paths can't both be live.

```bash
curl -X POST http://localhost:3000/api/media/webhook \
  -H "content-type: application/json" \
  -H "x-cron-secret: local-dev-cron-secret" \
  -d '{"videoId":"<id>","publish":true}'
# {"received":true,"status":"PUBLISHED","notified":1}
```

Re-firing it does not duplicate notifications.

## Cron

### `POST /api/cron/recompute-status`

Requires `x-cron-secret`. Because member status is derived and never stored,
this writes nothing to `User`; it reports the distribution and prunes expired
sessions and magic-link tokens.

```json
{
  "ranAt": "2026-07-25T17:01:03.178Z",
  "members": 12,
  "statuses": { "ACTIVE": 9, "AT_RISK": 2, "INACTIVE": 1 },
  "pruned": { "sessions": 0, "magicLinkTokens": 0 }
}
```

## Conventions

- **Validation** — every entry point parses input with a Zod schema from
  `src/lib/validation.ts`, shared with the client forms.
- **Errors** — actions return `{ ok, message }` rather than throwing, so forms
  can render a message. `401` for unauthenticated, `403` for plan-gated, `400`
  for malformed, `503` for an unconfigured integration.
- **Shared secrets** — compared with `timingSafeEqual`, never `===`.
