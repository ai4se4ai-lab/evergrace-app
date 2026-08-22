import { preferencesSchema, type Preferences } from "./validation";

export const PREFERENCES_COOKIE = "evergrace_prefs";

export const defaultPreferences: Preferences = preferencesSchema.parse({});

/**
 * Accessibility preferences live in two places (spec §7): a cookie so an
 * anonymous visitor's choices survive navigation and are readable during SSR
 * (no flash of the wrong theme), and `User.preferences` so a signed-in member
 * keeps them across devices. The cookie is always written; the column is
 * written too when there is a session.
 */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function serializePreferences(prefs: Preferences): string {
  return JSON.stringify(prefs);
}

export const TEXT_SIZE_PX: Record<Preferences["textSize"], string> = {
  "16": "16px",
  "20": "20px",
  "24": "24px",
};

export const TEXT_SIZE_LABEL: Record<Preferences["textSize"], string> = {
  "16": "Small",
  "20": "Medium",
  "24": "Large",
};
