# Business rules

Every rule below lives in [`src/lib/domain.ts`](../src/lib/domain.ts) and is
covered by [`src/lib/domain.test.ts`](../src/lib/domain.test.ts) (35 tests). The
spec names the prototype's `renderVals()` logic as the executable specification,
so these are ports, not reinterpretations.

## Access gating

Two ordinal scales:

| Plan | Rank | | Access tier | Rank |
|---|---|---|---|---|
| `BASIC` (free) | 0 | | `FREE` | 0 |
| `MEMBER` ($9/mo) | 1 | | `MEMBERS` | 1 |
| `PREMIUM` ($19/mo) | 2 | | `PREMIUM` | 2 |

```ts
canView(video, viewer) === planRank(viewer.plan) >= accessRank(video.access)
```

- A signed-out visitor is treated as `BASIC`: they may browse, and Free videos
  play, but anything higher is locked.
- An `ADMIN` can view any tier, so staff can preview what they publish.
- `requiredPlanFor(access)` gives the cheapest unlocking plan, which is what the
  upgrade modal names in its banner.

**Enforcement vs. presentation.** `getVideoDetail` omits `sourceUrl` and
`muxPlaybackId` when `canView` is false — that is the enforcement, and it is
server-side. The lock icon and "🔒 Upgrade to watch" label are presentation.

**What is never gated:** intensity, stance, focus, duration, master, level, and
the access tier itself are shown on every card and detail page regardless of
plan. Spec §6.7 calls this "no surprises", and it is enforced structurally —
`toCard()` builds the metadata line before it evaluates `locked`.

## Following is a paid feature

```ts
canFollow(plan) === planRank(plan) >= planRank("MEMBER")
```

Basic members see the follow chips disabled with an upsell. `toggleFollow`
re-checks the same predicate server-side and returns a refusal, so the disabled
attribute is a courtesy rather than the control.

## Health check-in → track

Scored server-side from four answers. Ported rule-for-rule from the prototype's
`computeTier()`, **in this order** — the first matching branch wins:

1. `surgery = yes` **or** `dizzy = often` **or** `mobility = seated` → **`SEATED`**
2. `mobility = supported` **or** `dizzy = sometimes` **or** `joints ∈ {significant, little}` → **`SUPPORTED`**
3. otherwise → **`ACTIVE`**

Two consequences worth stating because they look like bugs but are the specified
behaviour:

- Ordering matters. Recent surgery routes someone to `SEATED` even if they say
  they prefer standing with support — the safest branch wins.
- *Any* joint pain, including "a little", is enough for `SUPPORTED`. `ACTIVE`
  requires every answer to be unrestricted.

The `SEATED` result screen also shows the safety notice about high-intensity
videos being locked, and advises talking to a doctor.

Raw answers and the computed track are both persisted, so a future change to the
rule can rescore existing members rather than being applied retroactively by
accident.

### Track → suggested session

`stancesForTrack` widens as capability increases: `SEATED` → seated only;
`SUPPORTED` → seated + supported; `ACTIVE` → all three. "Today's suggested
session" is the first published video in that stance set which the member hasn't
started, ordered by level then age, falling back to the earliest published video
if they've started everything.

## Member status (derived)

```
INACTIVE  if lastActiveAt older than 14 days
AT_RISK   if lastActiveAt older than 7 days, or average Progress.percent < 25
ACTIVE    otherwise
```

Checked in that order, so the more severe classification wins. Thresholds are
exported as constants (`AT_RISK_AFTER_DAYS`, `INACTIVE_AFTER_DAYS`,
`AT_RISK_PROGRESS_THRESHOLD`) rather than inlined. On the seeded roster this
yields 9 active / 2 at risk / 1 inactive, matching the prototype's fixture.

## Progress

```ts
percent = clamp(round(secondsWatched / durationSeconds * 100), 0, 100)
```

- Zero-duration videos return 0 rather than dividing by zero.
- `recordProgress` takes `max(incoming, stored)`, so scrubbing back to the start
  cannot erase real progress.
- The player reports every ~10 seconds while playing, on pause, on end, and on
  unmount.

## Streak

Consecutive days with any recorded activity, counting back from today. If there
is no activity today, the count starts at yesterday — an evening practitioner
should not lose their streak to the clock. Multiple sessions in one day count
once. A gap of a full day breaks it.

## Notification reasons

Built with the prototype's exact strings:

| Follow | Reason |
|---|---|
| Category | `New in Balance` |
| Master | `New from Master Ken Ryu` |
| Level | `New in Level 0 — Foundations` |

A member who follows several matching axes receives **one** notification, with
the most specific reason (master > level > category). A notification is locked —
showing "🔒 Upgrade to watch" — exactly when `!canView(video, user)`.

## Plan changes

`User.plan` is written in exactly one function, `applyPlanChange`, called only
from the Stripe webhook (`checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`) or, when
Stripe is not configured, from the local confirm route. Nothing on the client can
change a plan. Choosing a lower plan is treated as a downgrade and routed to the
billing portal rather than Checkout.
