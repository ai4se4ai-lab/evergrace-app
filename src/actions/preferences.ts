"use server";

import { cookies } from "next/headers";

import { getViewer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PREFERENCES_COOKIE, serializePreferences } from "@/lib/preferences";
import { preferencesSchema } from "@/lib/validation";

/**
 * Persists the accessibility panel's state. Always writes the cookie (so
 * anonymous visitors keep their choices and SSR can read them), and also the
 * `User.preferences` column when signed in.
 */
export async function savePreferences(input: unknown): Promise<void> {
  const prefs = preferencesSchema.parse(input);
  const serialized = serializePreferences(prefs);

  const store = await cookies();
  store.set(PREFERENCES_COOKIE, serialized, {
    httpOnly: false, // read by the client provider on hydration
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const viewer = await getViewer();
  if (viewer) {
    await prisma.user.update({
      where: { id: viewer.id },
      data: { preferences: serialized },
    });
  }
}
