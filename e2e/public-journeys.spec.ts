import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the journeys a visitor can complete without an account,
 * plus the access-gating rule that matters most (spec §6.7).
 */

test("landing page presents the hero and both calls to action", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Move with confidence, at your own pace.",
  );
  await expect(page.getByRole("link", { name: /Begin — it’s free/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse videos" })).toBeVisible();
});

test("library shows each video's details before playback, locked or not", async ({ page }) => {
  await page.goto("/library");

  const firstCard = page.getByRole("button").filter({ hasText: "Intensity" }).first();
  await expect(firstCard).toContainText("Intensity");
  await expect(firstCard).toContainText("Stance");
  await expect(firstCard).toContainText("Focus");
  await expect(firstCard).toContainText("Length");
});

test("focus filters are query-string driven and shareable", async ({ page }) => {
  await page.goto("/library?focus=Balance");
  await expect(page.getByRole("link", { name: "Balance", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("a premium video is locked for a signed-out visitor", async ({ page }) => {
  await page.goto("/library/tai-chi-weight-shifts");

  await expect(page.getByText(/is a Premium video/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
});

test("a free video plays for a signed-out visitor", async ({ page }) => {
  await page.goto("/library/seated-balance-and-breathing");

  // `exact` matters: the syllabus chapter triggers are also buttons.
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Transcript" })).toBeVisible();
});

test("the health check-in scores answers and recommends a track", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Start the check-in" }).click();

  await page.getByText("Seated in a chair").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByText("No", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByText("Rarely or never").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByText("No", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Seated mobility preference forces the Seated track.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Seated");
  await expect(page.getByText(/high-intensity videos are locked/)).toBeVisible();
});

test("admin routes redirect anonymous visitors to the staff sign-in", async ({ page }) => {
  await page.goto("/admin/reports");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("every admin section is guarded, not just the entry point", async ({ page }) => {
  for (const path of [
    "/admin/settings",
    "/admin/content/blog",
    "/admin/content/categories",
    "/admin/videos/levels",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login/);
  }
});

test("an unknown video URL returns a real 404, not a 200 shell", async ({ page }) => {
  // Regression guard: a Suspense boundary above the page (e.g. a root
  // loading.tsx) commits a 200 before notFound() runs, which would let
  // crawlers index missing pages.
  const response = await page.goto("/library/no-such-video");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("couldn’t find that page");
});

test("the accessibility panel changes the root text size", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Accessibility" }).click();

  await page.getByRole("button", { name: /Large/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "24");
});
