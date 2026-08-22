# Design system

The prototype (`index.html`) encodes a deliberate, senior-friendly visual
identity. It was ported, not restyled. Copy, spacing, radii, and colour values
come straight across; the only change is inline styles becoming CSS variables
plus Tailwind utilities.

## Tokens

Defined in [`src/app/globals.css`](../src/app/globals.css) and exposed to
Tailwind through [`tailwind.config.ts`](../tailwind.config.ts), so
`bg-surface`, `text-muted`, `border-line` resolve to `var(--…)` and the whole
palette swaps without any class changing.

### Light (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f2ece0` | Page background — warm, low-glare |
| `--surface` | `#fbf8f2` | Cards, header, panels |
| `--fg` | `#2c2824` | Body text |
| `--muted` | `#6b635a` | Secondary text |
| `--line` | `#ddd4c6` | 2px borders |
| `--accent` | `#2a6fb0` | Primary actions |
| `--accent-dark` | `#1f5a92` | Links, hover |
| `--accent-soft` | `#e6eef6` | Selected chips, hover fills |
| `--success` / `--success-soft` | `#3f7d5c` / `#e2efe8` | Free tier, completion |
| `--warn` / `--warn-soft` | `#9a7420` / `#faf0da` | Premium tier, locks |

### Dark

`--bg #201d1a`, `--surface #2b2723`, `--fg #f0ebe3`, `--muted #a89f92`,
`--line #3d3833`, `--accent #5b9bd8`, `--accent-dark #8fbde6`,
`--accent-soft #2f3a45`, `--success #6cbf92`, `--warn #e0b46a`.

### High contrast

Overrides either mode: pure `#ffffff` surfaces, `#000000` text and borders,
`--accent #004a99`. Applied via `[data-contrast="high"]`, which is written after
the theme block so it always wins.

### Selection

`<html>` carries four attributes, set server-side from the cookie or user record
so there is no flash of the wrong palette:

```html
<html data-theme="light|dark" data-theme-pref="light|dark|auto"
      data-contrast="normal|high" data-text-size="16|20|24">
```

`auto` is resolved before first paint by a small `beforeInteractive` script and
then kept live by a `matchMedia` listener in `PreferencesProvider`.

## Typography

- **Display / UI:** Baloo 2 (500–800) — headings, buttons, chart labels.
- **Body:** Public Sans (400–700 + italic 400) — paragraphs, tables.
- Loaded from Google Fonts with `preconnect`, matching the prototype, with
  system fallbacks so the layout survives an offline load.

Root font size is user-controlled at **16 / 20 / 24px** via `[data-text-size]`.
Everything downstream is sized in `em`/`rem`, so the whole interface scales
proportionally — this is why component sizes are expressed as `text-[1.05em]`
rather than fixed pixels.

## Spacing, radii, targets

| Property | Value |
|---|---|
| Minimum interactive height | **44px** (`min-h-touch`) |
| Primary buttons | 52–64px (`min-h-control`, `min-h-hero`) |
| Radii | 8–12px small controls, 14–24px cards and modals, 50% pills/avatars |
| Borders | 2px throughout — legible at low contrast sensitivity |
| Content width | `max-w-shell` (1180px), `max-w-prose` (68ch) |

## Components

`src/components/ui/` holds the primitives; the spec calls for shadcn/ui, and
these are the same idea — Radix behaviour plus project styling — built directly
on Radix (`Dialog`, `Popover`, `Accordion`, `Tabs`, `Switch`) so there is no
generator step. See [SPEC_COMPLIANCE.md](./SPEC_COMPLIANCE.md).

| Component | Notes |
|---|---|
| `Button` / `ButtonLink` | Variants `primary` `outline` `ghost` `dark` `danger`; sizes `sm` `md` `lg` `hero`, all ≥44px |
| `AccessBadge` etc. | Tier, status, plan, and member-status pills. **Always paired with text**, never colour alone. |
| `Card`, `StatCard`, `SectionHeading` | Layout shells |
| `Field`, `Input`, `Select`, `Textarea` | Labelled controls with error and hint slots |
| `PlaceholderArt` | The prototype's 45° hatch, for where photography will go |

Feature components: `FeatureCarousel`, `VideoCard`, `PlayerStage`, `Syllabus`,
`LockedStage`, `MoodSlider`, `FollowChips`, `MyLibraryTabs`, `PlanModal`,
`AccessibilityPanel`, `NotificationBell`, and the three Recharts wrappers.

## Charts

Recharts, fed entirely by server-computed aggregates. Colours come from
`--chart-1..4` so they re-tone per theme. Every chart carries a text legend or
axis labels; none relies on colour alone to convey which series is which.

## Motion

Two keyframes from the prototype — `fadeup` (panels, modals) and `pop` (the
check-in success tick). A global `prefers-reduced-motion` block collapses all
animation and transition durations to ~0, and the carousel additionally checks
the same query to disable autoplay outright rather than merely animating faster.

## Print

`.no-print` hides the header, footer, and admin console chrome. The print sheet
renders on white with black rules and always carries the confidentiality footer:
*"Confidential — member health data. Handle per HIPAA / PIPEDA policy."*
