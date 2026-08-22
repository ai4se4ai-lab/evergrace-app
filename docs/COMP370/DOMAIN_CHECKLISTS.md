# Domain Sign-Off Checklists - EverGrace_Checklists_DEVELOPERS

EverGrace is built and documented against a set of **assumptions and
placeholder content** standing in for input that five other domains own:
**Graphic & Digital Design**, **Communication**, **Nursing**, **Business**,
and **Jujutsu Society**. Every assumption listed below traces to something
concrete in the codebase — a design token in
[`src/app/globals.css`](../src/app/globals.css), a copy string in
[`src/content/site.ts`](../src/content/site.ts), a rule in
[`src/lib/domain.ts`](../src/lib/domain.ts), a seeded row in
[`prisma/seed.ts`](../prisma/seed.ts), or a decision recorded in
[PROJECT_SPEC.md](./PROJECT_SPEC.md), [BUSINESS_RULES.md](./BUSINESS_RULES.md),
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), or [ACCESSIBILITY.md](./ACCESSIBILITY.md).

**How to use this document.** Each domain owner works through their table and,
per row:

- Ticks **Done** if the current build's assumption is approved as-is, or if
  the domain's real input has been supplied and integrated.
- Leaves it unticked and uses **Comments** to say what's missing, what should
  change, or when the real input will land.
- Treats the **M/O** column as the engineering team's starting judgment of
  whether the row is **Mandatory** (blocks launch / a safety or legal risk if
  skipped) or **Optional** (improves the product but does not block it) — a
  domain owner may override this in Comments (e.g. "M/O: should be Mandatory,
  here's why").

This is a living document — re-run it whenever a domain's deliverable lands,
and see [COMP370_PROJECT.md](./COMP370_PROJECT.md) §2 Step 2 for how student
teams should turn an unticked row into a data contract rather than blocking
on it.

**Handing this to a domain expert who doesn't need the code references?** Use
[DOMAIN_CHECKLISTS_FOR_EXPERTS.md](./DOMAIN_CHECKLISTS_FOR_EXPERTS.md) instead
— same 5 × 32 items, same order, plain language, with a row-by-row mapping
back to this document.

---

## 1. Graphic & Digital Design

Governs: [`src/app/globals.css`](../src/app/globals.css) design tokens,
[`src/components/ui/`](../src/components/ui) primitives, imagery, and
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

| # | Checklist item | M/O | Done | Comments |
|---|---|---|---|---|
| 1 | Approve the light-theme token set (`--bg #f2ece0`, `--surface #fbf8f2`, `--fg #2c2824`, `--accent #2a6fb0`, …) or supply replacements | Mandatory | ☐ | |
| 2 | Approve the dark-theme token set (`--bg #201d1a`, `--accent #5b9bd8`, …) | Mandatory | ☐ | |
| 3 | Approve the high-contrast override (`#ffffff`/`#000000`/`#004a99`) meets AAA contrast intent | Mandatory | ☐ | |
| 4 | Approve or replace the display/UI typeface (Baloo 2, weights 500–800) | Mandatory | ☐ | |
| 5 | Approve or replace the body typeface (Public Sans, 400–700 + italic) | Mandatory | ☐ | |
| 6 | Supply self-hostable font files/license if replacing the Google Fonts–loaded pair | Optional | ☐ | |
| 7 | Supply an app favicon and wordmark/logo (currently none) | Mandatory | ☐ | |
| 8 | Supply hero imagery/video for the landing-page `FeatureCarousel` (currently text-only slides) | Mandatory | ☐ | |
| 9 | Supply an icon set for the four Focus Area categories (Balance, Breathing, Joint health, Safety) | Mandatory | ☐ | |
| 10 | Supply instructor ("Master") headshot photography for `/admin/content/masters` and video credits | Mandatory | ☐ | |
| 11 | Supply About-page team headshot photography (currently initials-only avatars) | Mandatory | ☐ | |
| 12 | Define an art-direction guideline for admin-uploaded video thumbnails | Mandatory | ☐ | |
| 13 | Approve `PlaceholderArt`'s 45° hatch pattern as the final "photography pending" state, or supply a replacement | Optional | ☐ | |
| 14 | Supply journal/blog post thumbnail imagery guidelines | Mandatory | ☐ | |
| 15 | Approve badge/pill iconography (🔒 lock, tier badges) as on-brand, or supply replacements | Optional | ☐ | |
| 16 | Approve the 4-color chart palette (`--chart-1`…`--chart-4`) for brand fit and accessibility | Mandatory | ☐ | |
| 17 | Supply print-sheet branding (logo/header) for the PDF report exports | Optional | ☐ | |
| 18 | Approve the spacing/radius scale (8–12px controls, 14–24px cards/modals) against brand guidelines | Optional | ☐ | |
| 19 | Confirm the 44px minimum touch-target rule does not conflict with brand button styling | Mandatory | ☐ | |
| 20 | Approve the two motion keyframes (`fadeup`, `pop`) or supply brand-specific motion guidance | Optional | ☐ | |
| 21 | Confirm the reduced-motion fallback (near-zero transition, autoplay off) is acceptable from a brand-experience standpoint | Mandatory | ☐ | |
| 22 | Supply an illustration/graphic for the 404 and generic error pages | Optional | ☐ | |
| 23 | Supply a social-share / Open Graph image for public pages | Optional | ☐ | |
| 24 | Confirm mobile/tablet/desktop breakpoint priorities match the brand's expected device mix | Optional | ☐ | |
| 25 | Define a visual differentiation between the member-facing app and the staff-facing admin console | Optional | ☐ | |
| 26 | Approve the accessibility-panel iconography (text size, contrast, theme controls) | Optional | ☐ | |
| 27 | Confirm light/dark token pairs meet WCAG 2.1 AA contrast (4.5:1 body / 3:1 large text) against the approved brand palette | Mandatory | ☐ | |
| 28 | Supply a custom Mux Player skin/branding, or approve the stock player chrome | Optional | ☐ | |
| 29 | Supply email-template branding for magic-link and notification emails | Mandatory | ☐ | |
| 30 | Approve the confidentiality-footer styling on printed PDF reports | Optional | ☐ | |
| 31 | Provide loading-skeleton visual style guidance (currently unstyled shimmer blocks) | Optional | ☐ | |
| 32 | Sign off on a final visual QA pass across mobile/tablet/desktop before launch | Mandatory | ☐ | |

---

## 2. Communication

Governs: [`src/content/site.ts`](../src/content/site.ts) marketing copy,
seeded `BlogPost`/`TeamMember` rows, health check-in and notification copy,
email subject lines.

| # | Checklist item | M/O | Done | Comments |
|---|---|---|---|---|
| 1 | Approve or replace the hero tagline: "Gentle martial arts for a stronger, steadier you" | Mandatory | ☐ | |
| 2 | Approve or replace the three homepage feature blurbs (Better balance / Safety first / A gentle community) | Mandatory | ☐ | |
| 3 | Supply real member testimonials with consent/release, replacing the three placeholder quotes | Mandatory | ☐ | |
| 4 | Approve the three About-page pillars copy (Safety first, Accessible by design, Progress not competition) | Mandatory | ☐ | |
| 5 | Supply a content calendar and real posts for "The Steady Path Journal" to replace seeded blog posts | Mandatory | ☐ | |
| 6 | Review the four health check-in questions for plain-language clarity (non-clinical audience) | Mandatory | ☐ | |
| 7 | Approve the safety-notice copy shown after a `SEATED` result | Mandatory | ☐ | |
| 8 | Supply final copy for the three plan cards (Basic / Member / Premium) descriptions and CTAs | Mandatory | ☐ | |
| 9 | Approve notification message templates ("New in Balance", "New from Master …", "New in Level 0 — Foundations") | Optional | ☐ | |
| 10 | Supply the magic-link sign-in email subject line and body copy | Mandatory | ☐ | |
| 11 | Supply a welcome/onboarding email sequence (post signup) | Optional | ☐ | |
| 12 | Supply upgrade/upsell modal copy shown when a locked video is opened | Mandatory | ☐ | |
| 13 | Approve the locked-content messaging tone ("🔒 Upgrade to watch") | Optional | ☐ | |
| 14 | Supply FAQ content for `/about` or `/library` | Optional | ☐ | |
| 15 | Review the confidentiality-footer legal wording ("Confidential — member health data. Handle per HIPAA / PIPEDA policy.") | Mandatory | ☐ | |
| 16 | Supply launch/social-media announcement copy | Optional | ☐ | |
| 17 | Confirm all public-facing copy meets a plain-language reading-level target appropriate for older adults | Mandatory | ☐ | |
| 18 | Supply meta descriptions / SEO copy for public routes (`/`, `/library`, `/about`, `/blog`) | Optional | ☐ | |
| 19 | Approve error-page copy (404, generic error boundary) | Optional | ☐ | |
| 20 | Supply instructor bios for each seeded "Master" profile | Mandatory | ☐ | |
| 21 | Supply a brand-voice/tone guide so future copy stays consistent | Optional | ☐ | |
| 22 | Approve call-to-action button labels across the app ("Watch a sample", "Start your check-in", "See your dashboard") | Optional | ☐ | |
| 23 | Review accessibility-panel labels and tooltips for plain-language clarity | Optional | ☐ | |
| 24 | Supply Terms of Service and Privacy Policy content (not yet present in the app) | Mandatory | ☐ | |
| 25 | Define a content-moderation guideline should member-facing comments ever be added | Optional | ☐ | |
| 26 | Approve the sender name/address branding for outbound email (`EMAIL_FROM`) | Mandatory | ☐ | |
| 27 | Supply naming conventions for video chapters/lessons ("Roadmap" panel) | Optional | ☐ | |
| 28 | Confirm the read-aloud feature announces each route's `<h1>` in a way that reads naturally aloud (no stray icons/emoji) | Mandatory | ☐ | |
| 29 | Review copy on the admin content-management screens for staff clarity | Optional | ☐ | |
| 30 | Confirm consistent terminology across the whole app ("member" vs "student", "class" vs "session", "instructor" vs "Master") | Mandatory | ☐ | |
| 31 | Note any future multi-language requirements, even though v1 ships English-only | Optional | ☐ | |
| 32 | Sign off on a final proofreading pass across all real content before launch | Mandatory | ☐ | |

---

## 3. Nursing

Governs: `HealthCheckIn` scoring in [`src/lib/domain.ts`](../src/lib/domain.ts)
(`computeTrack`, `stancesForTrack`), the check-in questions, safety copy, and
health-data handling described in [BUSINESS_RULES.md](./BUSINESS_RULES.md).

| # | Checklist item | M/O | Done | Comments |
|---|---|---|---|---|
| 1 | Clinically validate the four health check-in questions (mobility, recent surgery/fall, dizziness, joint pain) | Mandatory | ☐ | |
| 2 | Review the `computeTrack` branch order for safety correctness — recent surgery/frequent dizziness/seated preference forces `SEATED` before anything else is considered | Mandatory | ☐ | |
| 3 | Confirm the `SEATED` result's safety notice is clinically accurate and appropriately cautious | Mandatory | ☐ | |
| 4 | Review `stancesForTrack` (which stances — seated/supported/free-standing — are permitted per track) for safety soundness | Mandatory | ☐ | |
| 5 | Define a per-video risk/contraindication field (e.g. risk level + safety note) and its allowed values | Mandatory | ☐ | |
| 6 | Review the two intensity labels (Gentle / Moderate) for clinically meaningful definitions | Mandatory | ☐ | |
| 7 | Review the three stance definitions (Seated / Supported / Free-standing) for physiotherapy accuracy | Mandatory | ☐ | |
| 8 | Confirm any "talk to a doctor" advisory copy is medically appropriate and not diagnostic | Mandatory | ☐ | |
| 9 | Confirm the confidentiality footer (HIPAA/PIPEDA reference) matches how health data is actually handled in this build | Mandatory | ☐ | |
| 10 | Confirm the four stored `HealthCheckIn` fields (mobility, surgery, dizzy, joints) are the minimum necessary data, and no more | Mandatory | ☐ | |
| 11 | Review whether `AT_RISK`/`INACTIVE` member-status thresholds (7/14 days inactivity, <25% progress) should be described to staff as engagement metrics only, not clinical risk | Optional | ☐ | |
| 12 | Define fall-risk warning criteria for Balance-category and other higher-risk content | Mandatory | ☐ | |
| 13 | Review the daily mood check-in (1–5 score) for clinical usefulness or recommend an alternative scale | Optional | ☐ | |
| 14 | Confirm no diagnostic or treatment claims appear anywhere in app copy (liability review) | Mandatory | ☐ | |
| 15 | Review video syllabi/transcripts for necessary safety cues (e.g. "hold a chair for support") | Mandatory | ☐ | |
| 16 | Confirm health-data visibility in the admin console (member detail, read-only, staff-only) is appropriately restricted | Mandatory | ☐ | |
| 17 | Recommend a data-retention policy for stored health check-in answers | Optional | ☐ | |
| 18 | Provide "stop if you feel pain/dizzy" guidance to embed in the video player UI | Mandatory | ☐ | |
| 19 | Review the `age` field's collection necessity and any range constraints | Optional | ☐ | |
| 20 | Confirm the accessibility controls (text size, contrast, read-aloud) meet the needs of the target population (low vision, tremor, cognitive load) | Mandatory | ☐ | |
| 21 | Recommend whether a recent fall/surgery answer should trigger safeguards beyond routing to `SEATED` | Optional | ☐ | |
| 22 | Provide pacing/rest-cue guidance for instructors to build into video roadmaps | Optional | ☐ | |
| 23 | Review the printed PDF report (member roster / reports) for appropriate health-data redaction | Mandatory | ☐ | |
| 24 | Confirm no health-related field is ever sent to client-side analytics or third-party scripts | Mandatory | ☐ | |
| 25 | Review whether the 25% average-progress `AT_RISK` threshold risks conflating disengagement with clinical decline in staff-facing language | Optional | ☐ | |
| 26 | Provide informed-consent language to sit alongside the health check-in itself | Mandatory | ☐ | |
| 27 | Recommend a re-assessment cadence (e.g. re-take the check-in every 90 days) | Optional | ☐ | |
| 28 | Confirm safety messaging appears before playback of any higher-intensity or Premium-tier video | Mandatory | ☐ | |
| 29 | Review the joint-pain question's phrasing for sensitivity and clarity ("a little" vs "significant") | Mandatory | ☐ | |
| 30 | Define a sign-off checklist Jujutsu Society must clear for any new video touching balance or joint mobility | Mandatory | ☐ | |
| 31 | Confirm alignment with relevant BC/provincial guidelines for older-adult exercise programming | Optional | ☐ | |
| 32 | Give final clinical/safety sign-off before public launch | Mandatory | ☐ | |

---

## 4. Business

Governs: `Plan`/`AccessLevel` tiers in [`src/lib/domain.ts`](../src/lib/domain.ts),
Stripe configuration, the Reports & Impact KPIs, and launch checklist items in
[DEPLOYMENT.md](./DEPLOYMENT.md).

| # | Checklist item | M/O | Done | Comments |
|---|---|---|---|---|
| 1 | Approve the three-tier pricing model (Basic free / Member $9 / Premium $19) or supply updated pricing | Mandatory | ☐ | |
| 2 | Approve which content maps to Free vs Members vs Premium (the `AccessLevel` tag on each video) | Mandatory | ☐ | |
| 3 | Confirm live Stripe product/price IDs (`STRIPE_PRICE_MEMBER`, `STRIPE_PRICE_PREMIUM`) match the approved pricing | Mandatory | ☐ | |
| 4 | Review the downgrade policy (any downgrade routes to the Stripe Billing Portal rather than in-app) for business fit | Optional | ☐ | |
| 5 | Define the refund/cancellation policy for paid subscriptions | Mandatory | ☐ | |
| 6 | Approve the KPI set shown on Reports & Impact (active-this-week, 30-day retention cohort, average progress) | Optional | ☐ | |
| 7 | Confirm the `AT_RISK` (7 days / <25% progress) and `INACTIVE` (14 days) thresholds align with business-defined churn | Mandatory | ☐ | |
| 8 | Supply growth/marketing funnel priorities to guide which public pages get the most investment | Optional | ☐ | |
| 9 | Decide whether a free-trial period is needed (none exists currently) | Optional | ☐ | |
| 10 | Approve Terms of Service and Privacy Policy before launch (legal + business sign-off) | Mandatory | ☐ | |
| 11 | Confirm the PDF export scope (Reports, Users, print sheets) meets business reporting needs | Optional | ☐ | |
| 12 | Define target acquisition channels to prioritize SEO/meta and landing-page investment | Optional | ☐ | |
| 13 | Approve the rule that following (subscribing to updates) is a paid-only feature (`plan ≥ MEMBER`) | Mandatory | ☐ | |
| 14 | Define billing currency and tax-handling requirements (not implemented in v1) | Mandatory | ☐ | |
| 15 | Define co-branding/attribution requirements with Jujutsu Society | Optional | ☐ | |
| 16 | Define whether additional admin roles are needed beyond the single `ADMIN` role (e.g. support-only, read-only) | Optional | ☐ | |
| 17 | Confirm the member-roster export (PDF) complies with any data-sharing agreements in place | Mandatory | ☐ | |
| 18 | Define uptime/SLA expectations for the production deployment | Optional | ☐ | |
| 19 | Confirm Stripe as the payment provider is acceptable, or request an alternative | Mandatory | ☐ | |
| 20 | Approve the outbound email sender domain and deliverability plan (SMTP provider selection) | Mandatory | ☐ | |
| 21 | Define success metrics for a pilot/demo phase (signups, retention, engagement targets) | Optional | ☐ | |
| 22 | Confirm the confidentiality/legal footer wording has legal sign-off | Mandatory | ☐ | |
| 23 | Decide whether promotional/discount codes are needed (not implemented in v1) | Optional | ☐ | |
| 24 | Define a support/contact channel for member billing questions (not currently surfaced in-app) | Mandatory | ☐ | |
| 25 | Review plan-comparison copy for accurate value-proposition messaging | Optional | ☐ | |
| 26 | Confirm analytics/error-tracking tools in use (Vercel Analytics, Sentry) meet privacy requirements | Mandatory | ☐ | |
| 27 | Approve the go-to-market timeline against the current engineering build order (see PROJECT_SPEC.md §8) | Optional | ☐ | |
| 28 | Confirm ownership of rotating the seeded admin password before any real launch | Mandatory | ☐ | |
| 29 | Define a reporting cadence for reviewing the admin Reports & Impact dashboard | Optional | ☐ | |
| 30 | Define a data-retention/deletion policy for churned members | Mandatory | ☐ | |
| 31 | Approve budget/timeline for Mux video-hosting costs at expected scale | Optional | ☐ | |
| 32 | Give final business sign-off against the production checklist in DEPLOYMENT.md before launch | Mandatory | ☐ | |

---

## 5. Jujutsu Society

Governs: `Category`, `Master`, `Level`, `Video`, `Chapter`/`Lesson`, and
`TranscriptLine` content described in [DATA_MODEL.md](./DATA_MODEL.md) and
managed through the admin console ([ADMIN_GUIDE.md](./ADMIN_GUIDE.md)).

| # | Checklist item | M/O | Done | Comments |
|---|---|---|---|---|
| 1 | Supply the authoritative instructor ("Master") roster: names, styles, bios | Mandatory | ☐ | |
| 2 | Approve or replace the seeded instructor names (Ken Ryu, Aiko Tanaka, Mei Lin) | Mandatory | ☐ | |
| 3 | Approve or revise the Focus Area taxonomy (currently Balance, Breathing, Joint health, Safety) | Mandatory | ☐ | |
| 4 | Define the Skill Level ladder (Level 0, 1, 2, …) names, descriptions, and progression criteria | Mandatory | ☐ | |
| 5 | Supply the real technique/video library to replace all seeded placeholder videos | Mandatory | ☐ | |
| 6 | Define the classification criteria for Intensity (Gentle vs Moderate) per technique | Mandatory | ☐ | |
| 7 | Define the classification criteria for Stance (Seated / Supported / Free-standing) per technique | Mandatory | ☐ | |
| 8 | Approve the chapter/lesson breakdown structure used in each video's "Roadmap" | Mandatory | ☐ | |
| 9 | Supply transcript text for every video, respecting the strict `m:ss  text` line format the parser requires | Mandatory | ☐ | |
| 10 | Confirm which techniques are appropriate for `SEATED` vs `SUPPORTED` vs `ACTIVE` tracks | Mandatory | ☐ | |
| 11 | Confirm whether prerequisite/progression logic between Levels is required (e.g. must finish Level 0 before Level 1) | Optional | ☐ | |
| 12 | Supply technique-specific safety notes to feed Nursing's per-video risk review | Mandatory | ☐ | |
| 13 | Define instructor-credit rules (can a video have no credited instructor? co-instruction?) | Optional | ☐ | |
| 14 | Approve each video's title and summary copy for technical accuracy | Mandatory | ☐ | |
| 15 | Recommend session duration/pacing guidelines per track | Optional | ☐ | |
| 16 | Supply a content roadmap for future videos beyond the initial launch set | Optional | ☐ | |
| 17 | Confirm consistent terminology app-wide ("Master" vs "Instructor" vs "Sensei") | Mandatory | ☐ | |
| 18 | Recommend which content should be Free vs Members vs Premium from a curriculum-value standpoint | Mandatory | ☐ | |
| 19 | Supply style/tradition attribution per category (e.g. Tai Chi, Qigong, Jujutsu lineage) | Optional | ☐ | |
| 20 | Review the "Today's suggested session" ordering logic (by level, then video age) for pedagogical soundness | Optional | ☐ | |
| 21 | Define what counts as lesson completion for the Roadmap "x of y complete" tracking | Optional | ☐ | |
| 22 | Define an onboarding process for future instructor video contributions | Optional | ☐ | |
| 23 | Supply sample/demo video files to test the admin Upload flow against real content | Mandatory | ☐ | |
| 24 | Confirm notification copy correctly reflects instructor names and titles ("New from Master …") | Optional | ☐ | |
| 25 | Recommend Focus Area ordering/priority on the landing-page category grid | Optional | ☐ | |
| 26 | Define production-quality standards for future video submissions (resolution, audio, framing) | Optional | ☐ | |
| 27 | Define the "seated fundamentals" filter criteria (called out in the spec as a filter, not a stored category) | Mandatory | ☐ | |
| 28 | Confirm technique names align with the Society's official curriculum documentation | Mandatory | ☐ | |
| 29 | Review the safety disclaimer shown before higher-intensity content, alongside Nursing | Optional | ☐ | |
| 30 | Approve the final content roster — which videos launch in v1 versus later | Mandatory | ☐ | |
| 31 | Provide a headshot/bio timeline so Design can schedule instructor photography | Optional | ☐ | |
| 32 | Give final curriculum sign-off before public launch | Mandatory | ☐ | |

---

## Summary tracker

| Domain | Total items | Mandatory | Optional | Done |
|---|---|---|---|---|
| Graphic & Digital Design | 32 | 15 | 17 | 0 |
| Communication | 32 | 17 | 15 | 0 |
| Nursing | 32 | 22 | 10 | 0 |
| Business | 32 | 16 | 16 | 0 |
| Jujutsu Society | 32 | 18 | 14 | 0 |

Update the **Done** column as rows are ticked in each section above.
