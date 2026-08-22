import { describe, expect, it } from "vitest";

import { validateBootEnv } from "./env";

describe("validateBootEnv", () => {
  it("does nothing outside production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "development",
        databaseUrl: undefined,
        authSecret: "evergrace-insecure-dev-secret",
        cronSecret: undefined,
      }),
    ).not.toThrow();
  });

  it("throws when DATABASE_URL is missing in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: undefined,
        authSecret: "real-secret",
        cronSecret: "real-cron",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("throws when AUTH_SECRET is the insecure default in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: "postgresql://x",
        authSecret: "evergrace-insecure-dev-secret",
        cronSecret: "real-cron",
      }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("throws when CRON_SECRET is missing in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: "postgresql://x",
        authSecret: "real-secret",
        cronSecret: undefined,
      }),
    ).toThrow(/CRON_SECRET/);
  });

  it("collects every problem in one error when several vars are invalid", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: undefined,
        authSecret: "evergrace-insecure-dev-secret",
        cronSecret: undefined,
      }),
    ).toThrow(/DATABASE_URL[\s\S]*AUTH_SECRET[\s\S]*CRON_SECRET/);
  });

  it("passes when everything required is set correctly in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: "postgresql://x",
        authSecret: "real-secret",
        cronSecret: "real-cron",
      }),
    ).not.toThrow();
  });
});
