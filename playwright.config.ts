import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite. Requires a seeded database and Playwright browsers:
 *
 *   npm run setup
 *   npx playwright install chromium
 *   npm run test:e2e
 *
 * By default this builds and serves the app on PORT (3000). Two escape hatches:
 *
 *   PORT=3210 npm run test:e2e          # different port, e.g. 3000 is taken
 *   E2E_BASE_URL=http://localhost:3210 npm run test:e2e
 *                                       # reuse a server you started yourself
 *                                       # (skips the managed webServer entirely)
 *
 * The managed server runs a production build rather than `next dev`, because a
 * cold dev compile can exceed the startup timeout on slower machines — and
 * because that is closer to what users actually get.
 */
const port = Number(process.env.PORT ?? 3000);
const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  // Admin specs mutate shared reference data (categories, posts), so they must
  // not race each other against one database.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: `npm run build && npx next start -p ${port}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 240_000,
          stdout: "pipe",
        },
      }),
});
