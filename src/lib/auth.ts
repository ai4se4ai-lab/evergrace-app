import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { prisma } from "./db";
import { env } from "./env";
import { magicLinkEmail, sendEmail } from "./mail";
import type { Plan, Role, Track } from "./domain";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };

const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 20;

export type Viewer = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  plan: Plan;
  track: Track | null;
  age: number | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Session tokens
//
// The token is opaque random bytes; only its SHA-256 hash is stored, so a
// database leak does not hand out live sessions. Sessions are DB-backed (not
// JWTs) so a plan change or role change takes effect on the next request —
// spec §6.3.
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(`${token}${env.authSecret}`).digest("hex");
}

/** Reads the viewer for the current request, or null when signed out. */
export async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expires < new Date()) return null;

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    plan: user.plan as Plan,
    track: (user.track as Track | null) ?? null,
    age: user.age,
    createdAt: user.createdAt,
  };
}

/** Throws when there is no signed-in member. Use inside member-only actions. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthError("You need to be signed in to do that.");
  return viewer;
}

/**
 * Throws unless the caller is an admin. Every admin Server Action calls this —
 * middleware alone is never trusted (spec §5).
 */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "ADMIN") throw new AuthError("Administrator access required.");
  return viewer;
}

export class AuthError extends Error {}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.session.create({
    data: { sessionToken: hashToken(token), userId, expires },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Keeps the derived member-status clock honest without a write on every hit. */
export async function touchLastActive(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Member sign-in: passwordless magic link
// ---------------------------------------------------------------------------

export type MagicLinkResult = {
  /** True when a real email went out. False in local mode. */
  delivered: boolean;
  /** Only returned outside production, so local sign-in needs no mailbox. */
  devUrl?: string;
};

export async function issueMagicLink(rawEmail: string): Promise<MagicLinkResult> {
  const email = normalizeEmail(rawEmail);
  const token = randomBytes(32).toString("hex");

  await prisma.magicLinkToken.create({
    data: {
      tokenHash: hashToken(token),
      email,
      expires: new Date(Date.now() + MAGIC_LINK_MINUTES * 60_000),
    },
  });

  const url = `${env.appUrl}/api/auth/callback?token=${token}`;
  const { delivered } = await sendEmail(magicLinkEmail(email, url));

  return {
    delivered,
    devUrl: process.env.NODE_ENV === "production" ? undefined : url,
  };
}

/**
 * Consumes a magic-link token and signs the member in, creating the account on
 * first use. Returns null when the token is unknown, expired, or already used.
 */
export async function consumeMagicLink(token: string): Promise<Viewer | null> {
  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expires < new Date()) return null;

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { email: record.email },
    update: { lastActiveAt: new Date() },
    create: { email: record.email, role: "MEMBER", plan: "BASIC" },
  });

  await createSession(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    plan: user.plan as Plan,
    track: (user.track as Track | null) ?? null,
    age: user.age,
    createdAt: user.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Admin sign-in: email + password
// ---------------------------------------------------------------------------

export async function verifyAdminCredentials(
  rawEmail: string,
  password: string,
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });

  // Compare against a dummy hash when the account is missing or member-only so
  // the response time does not reveal which emails are admin accounts.
  const hash = user?.role === "ADMIN" && user.passwordHash ? user.passwordHash : DUMMY_HASH;
  const matches = await bcrypt.compare(password, hash);

  if (!user || user.role !== "ADMIN" || !user.passwordHash || !matches) return { ok: false };
  return { ok: true, userId: user.id };
}

const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.CXbLxq0K0k7fnJ3sJqZ0m9K5A0nS";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Constant-time comparison for webhook/cron shared secrets. */
export function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
