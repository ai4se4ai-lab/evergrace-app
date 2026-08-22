"use server";

import { cookies } from "next/headers";

import { getViewer, issueMagicLink, normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeTrack, type Track } from "@/lib/domain";
import { healthCheckInSchema, signUpSchema } from "@/lib/validation";

const PENDING_CHECKIN_COOKIE = "evergrace_pending_checkin";

export type CheckInResult = {
  ok: boolean;
  track?: Track;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Step 1 of onboarding (spec §6.2): the answers are scored **server-side** —
 * the client never decides a member's track — and stashed in a short-lived
 * cookie so they survive the account-creation round trip.
 */
export async function submitHealthCheckIn(input: unknown): Promise<CheckInResult> {
  const parsed = healthCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please answer every question." };
  }

  const track = computeTrack(parsed.data);
  const viewer = await getViewer();

  if (viewer) {
    await persistCheckIn(viewer.id, parsed.data, track);
    return { ok: true, track };
  }

  const store = await cookies();
  store.set(PENDING_CHECKIN_COOKIE, JSON.stringify({ ...parsed.data, track }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return { ok: true, track };
}

/**
 * Step 2: create the account from the result screen and send the magic link.
 * The pending answers are attached as soon as the account row exists, so the
 * member's track is already set when they follow the link.
 */
export async function createAccountFromCheckIn(
  _prev: unknown,
  formData: FormData,
): Promise<CheckInResult & { devUrl?: string }> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    age: formData.get("age") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const store = await cookies();
  const pendingRaw = store.get(PENDING_CHECKIN_COOKIE)?.value;
  if (!pendingRaw) {
    return { ok: false, message: "Your answers expired. Please run the check-in again." };
  }

  const pending = healthCheckInSchema.safeParse(JSON.parse(pendingRaw));
  if (!pending.success) {
    return { ok: false, message: "Your answers expired. Please run the check-in again." };
  }

  const track = computeTrack(pending.data);
  const email = normalizeEmail(parsed.data.email);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: parsed.data.name, age: parsed.data.age, track },
    create: {
      email,
      name: parsed.data.name,
      age: parsed.data.age,
      role: "MEMBER",
      plan: "BASIC",
      track,
    },
  });

  await persistCheckIn(user.id, pending.data, track);
  store.delete(PENDING_CHECKIN_COOKIE);

  const link = await issueMagicLink(email);
  return {
    ok: true,
    track,
    devUrl: link.devUrl,
    message: link.delivered
      ? `Your account is ready. Check ${email} for your sign-in link.`
      : `Your account is ready. Local mode: use the link below to open your dashboard.`,
  };
}

async function persistCheckIn(
  userId: string,
  answers: { mobility: string; surgery: string; dizzy: string; joints: string },
  track: Track,
): Promise<void> {
  await prisma.$transaction([
    prisma.healthCheckIn.upsert({
      where: { userId },
      update: { ...answers, computedTrack: track, answeredAt: new Date() },
      create: { userId, ...answers, computedTrack: track },
    }),
    prisma.user.update({ where: { id: userId }, data: { track } }),
  ]);
}
