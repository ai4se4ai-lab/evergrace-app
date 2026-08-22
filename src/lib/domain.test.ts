import { describe, expect, it } from "vitest";

import {
  canFollow,
  canView,
  computeStreak,
  computeTrack,
  deriveMemberStatus,
  formatDuration,
  formatTimecode,
  lastActiveLabel,
  planRank,
  progressPercent,
  requiredPlanFor,
  slugify,
  type HealthAnswers,
} from "./domain";

const baseAnswers: HealthAnswers = {
  mobility: "free",
  surgery: "no",
  dizzy: "rarely",
  joints: "none",
};

const days = (n: number) => new Date(Date.now() - n * 86_400_000);

describe("computeTrack — ports the prototype's computeTier()", () => {
  it("returns ACTIVE only when every answer is unrestricted", () => {
    expect(computeTrack(baseAnswers)).toBe("ACTIVE");
  });

  it("routes recent surgery to SEATED regardless of mobility", () => {
    expect(computeTrack({ ...baseAnswers, surgery: "yes" })).toBe("SEATED");
  });

  it("routes frequent dizziness to SEATED", () => {
    expect(computeTrack({ ...baseAnswers, dizzy: "often" })).toBe("SEATED");
  });

  it("routes a seated mobility preference to SEATED", () => {
    expect(computeTrack({ ...baseAnswers, mobility: "seated" })).toBe("SEATED");
  });

  it("prefers SEATED over SUPPORTED when both would apply", () => {
    // supported mobility would be SUPPORTED, but surgery outranks it.
    expect(computeTrack({ ...baseAnswers, mobility: "supported", surgery: "yes" })).toBe("SEATED");
  });

  it("routes supported mobility to SUPPORTED", () => {
    expect(computeTrack({ ...baseAnswers, mobility: "supported" })).toBe("SUPPORTED");
  });

  it("routes occasional dizziness to SUPPORTED", () => {
    expect(computeTrack({ ...baseAnswers, dizzy: "sometimes" })).toBe("SUPPORTED");
  });

  it("routes any joint pain — even 'a little' — to SUPPORTED", () => {
    expect(computeTrack({ ...baseAnswers, joints: "little" })).toBe("SUPPORTED");
    expect(computeTrack({ ...baseAnswers, joints: "significant" })).toBe("SUPPORTED");
  });
});

describe("canView — plan gating", () => {
  const free = { access: "FREE" } as const;
  const members = { access: "MEMBERS" } as const;
  const premium = { access: "PREMIUM" } as const;

  it("lets Basic see only Free videos", () => {
    const viewer = { plan: "BASIC" } as const;
    expect(canView(free, viewer)).toBe(true);
    expect(canView(members, viewer)).toBe(false);
    expect(canView(premium, viewer)).toBe(false);
  });

  it("lets Member see Free and Members videos", () => {
    const viewer = { plan: "MEMBER" } as const;
    expect(canView(free, viewer)).toBe(true);
    expect(canView(members, viewer)).toBe(true);
    expect(canView(premium, viewer)).toBe(false);
  });

  it("lets Premium see everything", () => {
    const viewer = { plan: "PREMIUM" } as const;
    expect(canView(premium, viewer)).toBe(true);
  });

  it("treats a signed-out visitor as Basic", () => {
    expect(canView(free, null)).toBe(true);
    expect(canView(members, null)).toBe(false);
  });

  it("lets an admin preview any tier", () => {
    expect(canView(premium, { plan: "BASIC", role: "ADMIN" })).toBe(true);
  });

  it("orders plans BASIC < MEMBER < PREMIUM", () => {
    expect(planRank("BASIC")).toBeLessThan(planRank("MEMBER"));
    expect(planRank("MEMBER")).toBeLessThan(planRank("PREMIUM"));
  });
});

describe("requiredPlanFor", () => {
  it("maps each access tier to the cheapest plan that unlocks it", () => {
    expect(requiredPlanFor("FREE")).toBe("BASIC");
    expect(requiredPlanFor("MEMBERS")).toBe("MEMBER");
    expect(requiredPlanFor("PREMIUM")).toBe("PREMIUM");
  });
});

describe("canFollow — following is a paid feature", () => {
  it("blocks Basic and allows paid plans", () => {
    expect(canFollow("BASIC")).toBe(false);
    expect(canFollow("MEMBER")).toBe(true);
    expect(canFollow("PREMIUM")).toBe(true);
  });
});

describe("deriveMemberStatus", () => {
  const now = new Date("2026-07-25T12:00:00Z");
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000);

  it("marks a recently active member with good progress ACTIVE", () => {
    expect(deriveMemberStatus({ lastActiveAt: at(1), averageProgress: 70 }, now)).toBe("ACTIVE");
  });

  it("marks someone quiet for over a week AT_RISK", () => {
    expect(deriveMemberStatus({ lastActiveAt: at(9), averageProgress: 70 }, now)).toBe("AT_RISK");
  });

  it("marks someone quiet for over two weeks INACTIVE", () => {
    expect(deriveMemberStatus({ lastActiveAt: at(20), averageProgress: 70 }, now)).toBe("INACTIVE");
  });

  it("marks a recently active member with low progress AT_RISK", () => {
    expect(deriveMemberStatus({ lastActiveAt: at(0), averageProgress: 10 }, now)).toBe("AT_RISK");
  });

  it("prefers INACTIVE over AT_RISK when both apply", () => {
    expect(deriveMemberStatus({ lastActiveAt: at(30), averageProgress: 5 }, now)).toBe("INACTIVE");
  });

  it("uses 25% as the progress threshold", () => {
    expect(deriveMemberStatus({ lastActiveAt: at(0), averageProgress: 25 }, now)).toBe("ACTIVE");
    expect(deriveMemberStatus({ lastActiveAt: at(0), averageProgress: 24 }, now)).toBe("AT_RISK");
  });
});

describe("progressPercent", () => {
  it("rounds to a whole percent", () => {
    expect(progressPercent(300, 720)).toBe(42);
  });

  it("clamps above 100 and below 0", () => {
    expect(progressPercent(900, 720)).toBe(100);
    expect(progressPercent(-10, 720)).toBe(0);
  });

  it("returns 0 for a zero-length video rather than dividing by zero", () => {
    expect(progressPercent(60, 0)).toBe(0);
  });
});

describe("computeStreak", () => {
  it("returns 0 with no activity", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak([days(0), days(1), days(2)])).toBe(3);
  });

  it("survives an evening practitioner who hasn't practised yet today", () => {
    expect(computeStreak([days(1), days(2)])).toBe(2);
  });

  it("breaks when a day is missed", () => {
    expect(computeStreak([days(0), days(1), days(3)])).toBe(2);
  });

  it("returns 0 when the last activity is older than yesterday", () => {
    expect(computeStreak([days(4), days(5)])).toBe(0);
  });

  it("counts a day once even with several sessions", () => {
    expect(computeStreak([days(0), days(0), days(0)])).toBe(1);
  });
});

describe("formatting helpers", () => {
  it("formats durations in whole minutes, as the prototype did", () => {
    expect(formatDuration(720)).toBe("12 min");
    expect(formatDuration(540)).toBe("9 min");
  });

  it("formats timecodes as m:ss", () => {
    expect(formatTimecode(12)).toBe("0:12");
    expect(formatTimecode(123)).toBe("2:03");
  });

  it("labels last-active dates the way the roster does", () => {
    const now = new Date("2026-07-25T12:00:00Z");
    expect(lastActiveLabel(new Date("2026-07-25T09:00:00Z"), now)).toBe("Today");
    expect(lastActiveLabel(new Date("2026-07-24T09:00:00Z"), now)).toBe("Yesterday");
    expect(lastActiveLabel(new Date("2026-07-17T09:00:00Z"), now)).toBe("8 days ago");
  });

  it("slugifies titles into URL-safe ids", () => {
    expect(slugify("Seated Balance & Breathing")).toBe("seated-balance-breathing");
    expect(slugify("Standing Tall: Wall-Supported Stances")).toBe(
      "standing-tall-wall-supported-stances",
    );
  });
});
