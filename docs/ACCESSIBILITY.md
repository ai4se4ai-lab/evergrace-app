# Accessibility

Spec §7 calls accessibility non-negotiable on every screen. This records what is
implemented, where, and how to check it.

## The accessibility panel

Header button, open on every route. State is validated by
`preferencesSchema` and persisted twice: a cookie (so anonymous visitors keep
their choices, and SSR can read them — no flash of the wrong theme) and
`User.preferences` when signed in, so it follows a member across devices. Writes
are debounced 400ms.

| Control | Values | Mechanism |
|---|---|---|
| Text size | 16 / 20 / 24px (Small / Medium / Large) | `[data-text-size]` sets the root font size; the UI is sized in `em`/`rem` so everything scales |
| High contrast | on / off | `[data-contrast="high"]` swaps the token set, overriding light *and* dark |
| Read aloud | on / off | Web Speech API speaks the route's `<h1>` on navigation, rate 0.92 |
| Theme | Light / Dark / Auto | `[data-theme]`; Auto follows `prefers-color-scheme` and live-updates via `matchMedia` |

Read-aloud is wired through `<ReadAloudHeading text="…" />`, present on the
landing, library, player, dashboard, about, blog, and account routes. It renders
nothing and no-ops when speech synthesis is unavailable.

## Targets and keyboard

- Every interactive element clears **44×44px**; primary actions are 52–64px. The
  button size scale has no sub-44px option, so this can't regress by accident.
- Full keyboard operability. Radix primitives supply focus trapping, arrow-key
  navigation, and Escape handling for the modal, popovers, accordion, and tabs.
- Visible focus ring on everything: `:focus-visible { outline: 3px solid var(--accent) }`
  with a 2px offset — never removed.
- A skip link to `#main` is the first focusable element on every page.
- **Level reordering uses explicit ↑/↓ buttons rather than drag-and-drop.** The
  spec suggests `@dnd-kit`; for an interface whose primary users may have
  tremor or limited dexterity, a keyboard- and touch-operable control is the
  better call. Noted in [SPEC_COMPLIANCE.md](./SPEC_COMPLIANCE.md).

## Semantics

- One `<h1>` per route, then a descending heading order.
- Landmarks: `<header>`, `<nav aria-label>`, `<main id="main">`, `<footer>`,
  `<aside>` for the syllabus.
- The check-in questions are a `<fieldset>`/`<legend>` with real radio inputs —
  visually hidden but present, so arrow keys and screen readers work.
- Filter chips are links with `aria-current`, so filters are navigable and
  shareable, not opaque button state.
- Toggle chips use `aria-pressed`; the theme switch is a `radiogroup`.
- Tables carry a `<caption>` (visually hidden) and `scope="col"` headers.
- Live regions: notification list, mood label, form status messages, and the
  carousel viewport (`aria-live="polite"`).
- Every input has a real `<label>`; icon-only buttons carry `aria-label`.
- Progress bars expose `role="progressbar"` with `aria-valuenow`; the seek slider
  exposes `aria-valuetext` as a timecode rather than a raw second count.

## Lists declare their role

Chromium removes the `list` / `listitem` roles from a `<ul>` whose `display` is
`flex` or `grid` — a screen reader then never announces "list, 7 items". This
affected 18 lists across the app (the admin managers, the syllabus, plan perks,
the About team grid, the focus-area legend, member detail). All of them now set
`role="list"` explicitly. Worth remembering for any new list: Tailwind's
`flex`/`grid` on a `<ul>` silently costs you the semantics.

## Colour is never the only signal

Access tiers show the word *Free* / *Members* / *Premium* alongside the colour.
Locked content carries a padlock **and** "🔒 Upgrade to watch". Member status,
plan, and video status badges are all text-plus-tone. Charts have legends and
labelled axes. Completed lessons get a check mark and strikethrough, not just a
colour change.

## Motion

`prefers-reduced-motion: reduce` collapses all animations and transitions to
~0ms globally, and the carousel separately checks the query to switch autoplay
**off** rather than merely speeding it up. Card hover-lift and modal entrance
animations are covered by the same global rule.

## Contrast

Token pairs target WCAG 2.1 AA (4.5:1 body, 3:1 large text) in light and dark,
and AAA in high-contrast mode, where the palette is pure black on pure white
with `#004a99` accents.

## How to verify

Automated, in `e2e/public-journeys.spec.ts`:

```bash
npx playwright install chromium
npm run test:e2e
```

It asserts, among other things, that the panel actually changes
`html[data-text-size]`.

Manual checklist:

1. **Keyboard only** — tab from the top of `/`: skip link → logo → nav → theme
   switch → login → accessibility. Open the panel with Enter, change text size
   with arrows/Enter, close with Escape.
2. **Text at 24px** — set Large and walk `/`, `/library`, `/dashboard`,
   `/admin/reports`. Nothing should clip or overlap; tables scroll horizontally
   inside their container.
3. **High contrast + dark** — enable both; high contrast must win.
4. **Reduced motion** — enable it at the OS level and confirm the carousel stops
   advancing on its own while prev/next still work.
5. **Read aloud** — switch it on and navigate; each page announces its heading.
6. **Screen reader** — with NVDA or VoiceOver, confirm the check-in radio group,
   the roster table headers, and the unread notification count all announce.

To add axe-core assertions, install `@axe-core/playwright` and call it per route
in the e2e suite — the fixtures are already there.
