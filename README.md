# EverGrace-app: Senior-Friendly Martial Arts Platform

An accessible, high-fidelity interactive prototype of an online martial-arts training platform built for older adults. It combines a warm, large-type **member experience** with a full **admin console**, and ships with first-class accessibility controls (text scaling, high contrast, read-aloud) and light/dark theming throughout.

The entire product is a single self-contained Design Component: **`Senior Martial Arts Platform.dc.html`**.

---

## Getting started

1. Open `Senior Martial Arts Platform.dc.html` in a modern browser, or preview it in the editor.
2. No build step, install, or server required — the runtime helper `support.js` loads automatically.
3. Google Fonts (Public Sans, Baloo 2, Newsreader) load from the network for the intended typography.

### Try it out
- **Member flow:** Landing → *Start now* → health check-in → dashboard → library → video player.
- **Log in:** from the login screen, the *Log in* button drops you straight into the member dashboard.
- **Admin console:** on the login screen, choose **"Staff member?"** to reach the admin login, then enter the console.

---

# Member features

### Landing page
- Auto-advancing hero **feature carousel** (pauses on hover) with calls to action into onboarding and login.
- Social-proof testimonials and an **"Explore our library"** preview with category chips.

### Onboarding — health check-in (intake)
A short, plain-language questionnaire that recommends a starting track. Four questions:
1. **Movement preference** — seated / standing with support / freely standing.
2. **Recent surgery or fall** (last 3 months).
3. **Dizziness or shortness of breath** with light activity.
4. **Joint pain** that limits movement.

The answers produce a **recommended track** (Seated, Supported, or Active) with a description, then prompt account creation.

### Dashboard
The member home, showing:
- **Practice-minutes line chart** and a **focus-area donut chart**.
- **Today's session** and a **mood check-in**.
- **Your access level** card — current plan, what it unlocks, and a *Manage / upgrade plan* button.
- **Your subscriptions** card — everything the member follows (see below).
- **New for you** — fresh videos matched to the skills, masters, and levels the member follows.
- **My Library** — subscribed courses and saved videos, tabbed **Subscribed / Liked / Favorites**.

### Categories & levels (member view)
- **Skills & categories** (focus areas): **Balance, Breathing, Joint health, Safety** (plus *Seated fundamentals*). Members can follow any of these.
- **Levels** — a progression ladder members can follow:
  - **Level 0 · Foundations** — seated basics: posture, breathing, gentle joint mobility.
  - **Level 1 · Building Support** — standing with a wall/chair, flowing breath work.
  - **Level 2 · Confident Movement** — free-standing weight shifts and safe-falling technique.

### Subscriptions
Members follow content along three axes, shown on the dashboard as their active subscriptions:
- **Categories** (e.g. Balance)
- **Masters / instructors** (e.g. Ken Ryu)
- **Levels** (e.g. Level 0)

Following something means the member gets **New-for-you recommendations** and **notifications** when matching videos are added.

### Subscription plans & access levels
Three tiers, each unlocking a higher access level:

- **Basic — Free:** all free videos, progress tracking, health check-in.
- **Member — $9/mo:** everything in Basic + Members-only classes + ability to subscribe to masters & levels.
- **Premium — $19/mo:** everything in Member + premium masterclasses + early access to new videos.

**Access rules:** each video is tagged **Free**, **Members**, or **Premium**. Basic plan sees Free only; Member sees Free + Members; Premium sees everything. Attempting to watch a locked video opens an **upgrade modal** that names the video, its required tier, and the plan cards to upgrade.

### Video library
- Full catalog with **filters** by focus area, intensity, stance (seated / supported / free-standing), and master instructor.
- Every card states exactly what to expect before you begin (intensity · stance · focus · duration · master).

### Video player
- Large-hit-target **playback controls** and progress bar.
- **Interactive transcript** with the active caption highlighted.
- Sticky **syllabus / roadmap accordion** — weeks → lessons with **completion tracking** and progress summary.

### Notifications
- Bell icon in the header with an **unread badge**.
- Panel listing new-video alerts, each tagged with its **reason** (e.g. "New from Master Ken Ryu", "New in Balance") and **access tier**.
- New notifications are generated automatically when an admin publishes a video in a category the member follows.

### Supporting pages
- **About** and **Blog** marketing pages.
- **Login** (member) and a link through to **admin login**.

---

# Admin features

Reached via **Staff member? → Admin login**. The console has three tabbed sections plus modals.

### Reports (dashboard)
- Program-level **KPI stat cards**.
- **New members per month** growth chart (last 8 months).
- **Member progress report** table with a **Save as PDF / print** action.

### Videos
Two sub-tabs:

- **Catalog** — content management for every video: title, category, duration, **access level** (editable inline: Free / Members / Premium), and **status** (Published / Draft / Processing).
- **Upload modal** — add a new video with title, **category**, **access level**, duration, and intensity. Publishing into a followed category **notifies subscribed members**.
- **Skill Levels** — build the **Level 0 → Level 2** progression: create/edit levels, name, describe, and assign videos to each level so techniques build on the last.

### Users
- Full **member roster**: name, age, class/track, plan, session count, progress, last activity, and **status** (Active / At risk / Inactive).
- **Filters** by name search, class/track, plan, and age range.
- **Save as PDF / print** for the member list.

---

## Accessibility features

Accessibility is a core concern given the audience. Controls live in the **Accessibility** panel in the header:

- **Text size** — Small / Medium / Large global scaling.
- **High contrast** — maximum-legibility mode.
- **Read aloud** — speaks the current page heading aloud (text-to-speech).
- **Large touch targets** — controls sized well above minimum tap sizes throughout.
- **Light / Dark / Auto theme** — Auto follows the system preference.

---

## Content model (sample data)

The prototype ships with realistic sample data defined inline in the logic class:

- **Masters / instructors:** Ken Ryu (Tai Chi & Balance), Aiko Tanaka (Safe Falls & Support), Mei Lin (Breathing & Mobility).
- **Focus areas / categories:** Balance, Breathing, Joint health, Safety (+ Seated fundamentals).
- **Skill levels:** Level 0 Foundations, Level 1 Building Support, Level 2 Confident Movement.
- **Videos:** seated, wall-supported, and free-standing sessions, each with intensity, duration, master, and access tier.
- **Plans:** Basic (Free), Member ($9/mo), Premium ($19/mo).
- **Members:** a 12-person roster with age, track, plan, progress, sessions, and status.
- **Course syllabus:** multi-week chapters, each with individual lessons.
- **Notifications:** access-tagged new-video alerts.

To change any of this, edit the corresponding arrays/objects in the `class Component extends DCLogic` block near the bottom of the `.dc.html` file (`levels`, `plan`, `subs`, `notifs`, `usersData`, `adminCatalog`, `videosData`, `masters`, `categoryFocus`, `chaptersData`, `questions`).

---

## Technical notes

- **Format** — a single Design Component (`.dc.html`). Markup lives in the `<x-dc>` template; behavior lives in a `class Component extends DCLogic` script.
- **State-driven navigation** — a single `screen` state value switches between all screens: `landing`, `intake`, `dashboard`, `library`, `player`, `about`, `blog`, `login`, `adminLogin`, `admin`.
- **Access logic** — `planRank` / `accessRank` gate video visibility; the upgrade modal reads the locked video's tier to suggest the right plan.
- **Styling** — inline styles throughout, with CSS custom properties driving the palette so light / dark / high-contrast swap cleanly.
- **Fonts** — Baloo 2 (display), Public Sans (UI/body), Newsreader (editorial).
- **Dependencies** — none beyond the bundled `support.js` runtime and web fonts.

---

## Files

- `Senior Martial Arts Platform.dc.html` — the complete platform (all screens + logic).
- `image-slot.js` — drag-and-drop image slot web component.
- `support.js` — Design Component runtime (loaded automatically; do not edit).
- `README.md` — this file.
