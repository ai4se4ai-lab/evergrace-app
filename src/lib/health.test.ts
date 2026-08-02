import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from "@/lib/db";
import { checkDatabaseHealth } from "./health";

describe("checkDatabaseHealth", () => {
  it("returns ok:true when the query succeeds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }]);
    await expect(checkDatabaseHealth()).resolves.toEqual({ ok: true });
  });

  it("returns ok:false with the error message when the query fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("connection refused"));
    await expect(checkDatabaseHealth()).resolves.toEqual({
      ok: false,
      error: "connection refused",
    });
  });
});
