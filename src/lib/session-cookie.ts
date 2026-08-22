/**
 * The session cookie name, kept in its own module with no Node built-in
 * imports. `middleware.ts` runs on the Edge runtime and cannot bundle
 * `node:crypto`, so it imports this rather than `lib/auth`.
 */
export const SESSION_COOKIE = "evergrace_session";
