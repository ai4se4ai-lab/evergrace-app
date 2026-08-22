import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Admin console coverage, including the mutations. Signs in through the real
 * credentials form rather than injecting a session, so the login path is
 * exercised too.
 *
 * Requires the seeded database (`npm run setup`). Records created here carry a
 * per-run suffix so a failed run can never collide with the next one, and each
 * spec restores whatever it changed. The config pins `workers: 1` because these
 * specs share one database.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@evergrace.example";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "EverGrace!Admin1";

/** Unique per run, so leftovers from a failed run never clash. */
const RUN = `E2E${Date.now().toString(36).slice(-5)}`;

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in to admin" }).click();
  await expect(page).toHaveURL(/\/admin\/reports/);
}

/** A record's row. Scoped to list items so toasts and dialogs don't match. */
function row(page: Page, text: string): Locator {
  return page.getByRole("listitem").filter({ hasText: text }).first();
}

/**
 * Our own alert elements. Next.js renders a permanent
 * `<div role="alert" id="__next-route-announcer__">` for route changes, so an
 * unscoped getByRole("alert") is always ambiguous.
 */
function alerts(scope: Page | Locator): Locator {
  return scope.locator('[role="alert"]:not(#__next-route-announcer__)');
}

/**
 * Waits for a row to appear (or disappear), reloading between attempts.
 *
 * The managers update the list by re-fetching the Server Component after the
 * mutation. On a loaded machine that round trip can take longer than a plain
 * assertion timeout, which made these specs flaky even though the write had
 * already committed. Reloading is what a user would do, and it keeps the
 * assertion about "the UI reflects the database" rather than about latency.
 */
async function expectRow(page: Page, text: string, present: boolean) {
  await expect
    .poll(
      async () => {
        const count = await page.getByRole("listitem").filter({ hasText: text }).count();
        if (count > 0 === present) return true;
        await page.reload();
        return false;
      },
      { timeout: 45_000, intervals: [250, 500, 1000, 2000, 3000] },
    )
    .toBe(true);
}

async function confirmDialog(page: Page, name = "Delete") {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name, exact: true }).click();
  await expect(dialog).toBeHidden();
}

// ---------------------------------------------------------------------------
// Sign-in. Deliberately outside the signed-in block below: a signed-in admin
// visiting /admin/login is redirected straight into the console.
// ---------------------------------------------------------------------------

test("wrong credentials are refused with one generic message", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in to admin" }).click();

  await expect(alerts(page)).toContainText("don’t match a staff account");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("the staff sign-in page is reachable without a session", async ({ page }) => {
  // Regression guard: the login page must not sit inside app/admin/layout.tsx,
  // which redirects anonymous visitors here — that would loop forever.
  const response = await page.goto("/admin/login");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Admin sign-in" })).toBeVisible();
});

// ---------------------------------------------------------------------------

test.describe("signed in as staff", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("every admin section is reachable from the tab bar", async ({ page }) => {
    // Scoped to the admin nav: an unscoped "Content" also matches the
    // "Skip to main content" link.
    const nav = page.getByRole("navigation", { name: "Admin sections" });

    for (const [label, url] of [
      ["Videos", /\/admin\/videos/],
      ["Members", /\/admin\/users/],
      ["Content", /\/admin\/content/],
      ["Settings", /\/admin\/settings/],
      ["Reports & Impact", /\/admin\/reports/],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
    }
  });

  test("reports show KPIs, the signups chart, and a filterable roster", async ({ page }) => {
    await page.goto("/admin/reports");

    await expect(page.getByText("Total members")).toBeVisible();
    await expect(page.getByRole("heading", { name: "New members per month" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Margaret Ellison" })).toBeVisible();

    await page.getByLabel("Search name").fill("Margaret");
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/name=Margaret/);
    await expect(page.getByText("Showing 1 member")).toBeVisible();
    await expect(page.getByRole("link", { name: "Harold Weiss" })).toHaveCount(0);
  });

  test("member detail shows the health check-in behind a confidentiality notice", async ({
    page,
  }) => {
    await page.goto("/admin/reports");
    await page.getByRole("link", { name: "Margaret Ellison" }).click();

    await expect(page.getByRole("heading", { name: "Margaret Ellison" })).toBeVisible();
    await expect(page.getByText("Movement preference")).toBeVisible();
    await expect(page.getByText(/HIPAA \/ PIPEDA/)).toBeVisible();

    // v1 is read-only for members (spec §6.11).
    await expect(page.getByRole("button", { name: /Delete member/ })).toHaveCount(0);
  });

  test("changing a video's access level persists", async ({ page }) => {
    await page.goto("/admin/videos");

    const access = () =>
      page.getByRole("row", { name: /Qigong Morning Flow/ }).getByLabel(/Access level for/);

    await access().selectOption("PREMIUM");
    await expect(page.getByRole("status")).toContainText("Premium");
    await page.reload();
    await expect(access()).toHaveValue("PREMIUM");

    // Restore the seeded value.
    await access().selectOption("MEMBERS");
    await expect(page.getByRole("status")).toContainText("Members");
    await page.reload();
    await expect(access()).toHaveValue("MEMBERS");
  });

  test("publishing a draft moves it into the members' library", async ({ page }) => {
    await page.goto("/admin/videos");

    const status = () =>
      page.getByRole("row", { name: /Evening Wind-Down/ }).getByLabel(/Status for/);

    // Wait for the action to report back before reloading, or the reload can
    // abort the in-flight request.
    await status().selectOption("PUBLISHED");
    await expect(page.getByRole("status")).toBeVisible();
    await page.reload();
    await expect(status()).toHaveValue("PUBLISHED");

    // Restore the seeded draft state.
    await status().selectOption("DRAFT");
    await expect(page.getByRole("status")).toContainText("Draft");
    await page.reload();
    await expect(status()).toHaveValue("DRAFT");
  });

  test("chapters and lessons can be added and removed", async ({ page }) => {
    await page.goto("/admin/videos");
    await page.getByRole("link", { name: "Seated Balance & Breathing" }).click();

    await expect(page.getByRole("heading", { name: "Roadmap" })).toBeVisible();
    await expect(page.getByText("Week 1 · Foundations of Balance")).toBeVisible();

    const chapterTitle = `Chapter ${RUN}`;
    await page.getByLabel("New chapter").fill(chapterTitle);
    await page.getByRole("button", { name: "Add chapter" }).click();

    // Wait for the action's own confirmation before looking for the row: the
    // list only appears once the refreshed Server Component streams back.
    await expect(page.getByRole("status")).toContainText(chapterTitle);
    await expectRow(page, chapterTitle, true);

    const lessonTitle = `Lesson ${RUN}`;
    const chapter = row(page, chapterTitle);
    const lessonInput = chapter.getByLabel("New lesson");

    await expect(lessonInput).toBeVisible();
    await lessonInput.fill(lessonTitle);
    await expect(lessonInput).toHaveValue(lessonTitle);
    await chapter.getByRole("button", { name: "Add", exact: true }).click();

    await expect(page.getByRole("status")).toContainText(lessonTitle);
    await expectRow(page, lessonTitle, true);

    // Removing the chapter takes its lesson with it.
    await row(page, chapterTitle).getByRole("button", { name: "Remove" }).first().click();
    await confirmDialog(page);

    // Assert on the row, not a heading: `toHaveCount` counts hidden nodes, and
    // the confirm dialog's own title ("Remove “<chapter>”?") is also a heading
    // whose accessible name contains the chapter title.
    await expectRow(page, chapterTitle, false);
    await expectRow(page, lessonTitle, false);
  });

  test("a malformed transcript is refused, naming the line", async ({ page }) => {
    await page.goto("/admin/videos");
    await page.getByRole("link", { name: "Seated Balance & Breathing" }).click();

    const transcript = page.getByLabel("Transcript lines");
    // Whatever is currently stored — not a hard-coded expectation about the
    // seed, so a previous run's restore hiccup can't cascade into a failure here.
    const original = await transcript.inputValue();
    const originalLines = original.split("\n").filter((line) => line.trim().length > 0).length;
    expect(originalLines).toBeGreaterThan(0);

    await transcript.fill("this line has no timecode");
    await page.getByRole("button", { name: "Save transcript" }).click();
    await expect(alerts(page)).toContainText("Line 1");

    await transcript.fill("0:05  A valid caption.");
    await page.getByRole("button", { name: "Save transcript" }).click();
    await expect(page.getByRole("status")).toContainText("1 transcript line");

    // Restore whatever was there before.
    await transcript.fill(original);
    await page.getByRole("button", { name: "Save transcript" }).click();
    await expect(page.getByRole("status")).toContainText(`${originalLines} transcript line`);
  });

  test("a focus area still in use cannot be deleted", async ({ page }) => {
    await page.goto("/admin/content/categories");

    const balance = row(page, "Balance");
    await balance.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(alerts(dialog)).toContainText("still has");
    await expect(alerts(dialog)).toContainText("Move them to another focus area");

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(row(page, "Balance")).toBeVisible();
  });

  test("a focus area can be created, renamed, and deleted", async ({ page }) => {
    await page.goto("/admin/content/categories");

    const name = `Focus ${RUN}`;
    await page.getByRole("button", { name: "New focus area" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByLabel("Short description").fill("Created by the e2e suite.");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await expectRow(page, name, true);
    const created = row(page, name);
    await expect(created).toContainText("Created by the e2e suite.");
    await expect(created).toContainText("0 videos");

    const renamed = `${name} renamed`;
    await created.getByRole("button", { name: "Edit" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(renamed);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expectRow(page, renamed, true);

    // Unused, so deletion is allowed.
    await row(page, renamed).getByRole("button", { name: "Delete" }).click();
    await confirmDialog(page);
    await expectRow(page, renamed, false);
  });

  test("a duplicate focus area name is refused", async ({ page }) => {
    await page.goto("/admin/content/categories");

    await page.getByRole("button", { name: "New focus area" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Balance");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(alerts(dialog)).toContainText("already exists");
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("an instructor can be created and deleted", async ({ page }) => {
    await page.goto("/admin/content/masters");

    await expect(row(page, "Ken Ryu")).toContainText("Tai Chi & Balance");

    const name = `Instructor ${RUN}`;
    await page.getByRole("button", { name: "New instructor" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByLabel("Style").fill("Test Style");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await expectRow(page, name, true);
    await expect(row(page, name)).toContainText("Test Style");

    await row(page, name).getByRole("button", { name: "Delete" }).click();
    await confirmDialog(page);
    await expectRow(page, name, false);
  });

  test("an instructor credited on videos cannot be deleted", async ({ page }) => {
    await page.goto("/admin/content/masters");

    await row(page, "Ken Ryu").getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(alerts(dialog)).toContainText("credited on");
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("a journal post can be published, appears publicly, and is deleted", async ({ page }) => {
    const title = `Post ${RUN}`;
    await page.goto("/admin/content/blog");

    await page.getByRole("button", { name: "New post" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByLabel("Category").fill("Balance");
    await dialog.getByLabel("Excerpt").fill("A short excerpt written by the end-to-end suite.");
    await dialog
      .getByLabel("Body")
      .fill(
        "This body is comfortably longer than the fifty character minimum the schema asks for, so it saves cleanly.",
      );
    await dialog.getByRole("button", { name: "Publish post" }).click();
    await expect(dialog).toBeHidden();

    await expectRow(page, title, true);

    // It is live on the public journal.
    await page.goto("/blog");
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    await page.goto("/admin/content/blog");
    await row(page, title).getByRole("button", { name: "Delete" }).click();
    await confirmDialog(page);
    await expectRow(page, title, false);
  });

  test("team members can be added, reordered, and removed", async ({ page }) => {
    await page.goto("/admin/content/team");

    const name = `Person ${RUN}`;
    await page.getByRole("button", { name: "New team member" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByLabel("Role").fill("Test Role");
    await dialog.getByLabel("Bio").fill("Added by the end-to-end suite to check the team editor.");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await expectRow(page, name, true);

    // Newest is last, so it can move up but not down.
    await expect(row(page, name).getByRole("button", { name: `Move ${name} down` })).toBeDisabled();
    await row(page, name).getByRole("button", { name: `Move ${name} up` }).click();

    // Poll with a reload, like the row helpers: the reorder is a server round
    // trip, so the button's enabled state changes only once the list re-renders.
    await expect
      .poll(
        async () => {
          const button = row(page, name).getByRole("button", { name: `Move ${name} down` });
          if (await button.isEnabled()) return true;
          await page.reload();
          return false;
        },
        { timeout: 45_000, intervals: [250, 500, 1000, 2000, 3000] },
      )
      .toBe(true);

    await row(page, name).getByRole("button", { name: "Remove" }).click();
    await confirmDialog(page);
    await expectRow(page, name, false);
  });

  test("settings reports integration state without leaking secrets", async ({ page }) => {
    await page.goto("/admin/settings");

    await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible();
    await expect(page.getByText("Email delivery")).toBeVisible();
    await expect(page.getByText("Secrets are never displayed")).toBeVisible();
    await expect(page.getByText("Local mode").first()).toBeVisible();
  });

  test("PDF export routes carry the confidentiality footer and honour filters", async ({ page }) => {
    await page.goto("/admin/reports/print?name=Margaret");

    await expect(page.getByText("Member Progress Report")).toBeVisible();
    await expect(page.getByText(/Filtered by name/)).toBeVisible();
    await expect(page.getByText(/Confidential — member health data/)).toBeVisible();

    // Only the filtered member appears.
    await expect(page.getByRole("cell", { name: "Margaret Ellison" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Harold Weiss" })).toHaveCount(0);
  });

  test("the video catalog links through to a full edit screen", async ({ page }) => {
    await page.goto("/admin/videos");
    await page.getByRole("link", { name: "How to Fall Safely" }).click();

    await expect(page.getByRole("heading", { name: "How to Fall Safely" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();
    await expect(page.getByLabel("Duration (minutes)")).toHaveValue("11");
    await expect(page.getByRole("button", { name: "Delete video" })).toBeVisible();

    // Editing round-trips.
    const summary = page.getByLabel("Summary");
    const original = await summary.inputValue();

    await summary.fill(`Edited by ${RUN}.`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");

    await page.reload();
    await expect(page.getByLabel("Summary")).toHaveValue(`Edited by ${RUN}.`);

    // Restore the seeded copy.
    await page.getByLabel("Summary").fill(original);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
  });
});
