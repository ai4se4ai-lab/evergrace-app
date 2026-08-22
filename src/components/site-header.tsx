import Link from "next/link";

import { AccessibilityPanel } from "@/components/accessibility-panel";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeSwitch } from "@/components/theme-switch";
import { ButtonLink } from "@/components/ui/button";
import type { Viewer } from "@/lib/auth";
import { TRACK_LABEL } from "@/lib/domain";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Video Library" },
  { href: "/about", label: "About Us" },
  { href: "/blog", label: "Blog" },
];

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const isAdmin = viewer?.role === "ADMIN";

  return (
    <header className="no-print sticky top-0 z-40 flex flex-wrap items-center gap-5 border-b-2 border-line bg-surface px-7 py-4">
      <Link href="/" aria-label="EverGrace home" className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-[1.25em] font-bold text-white"
          aria-hidden
        >
          道
        </span>
        <span className="font-display text-[1.2em] font-extrabold">EverGrace</span>
      </Link>

      <nav aria-label="Main" className="ml-2 flex flex-wrap gap-1.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="min-h-touch rounded-control px-4 py-3 font-semibold hover:bg-accent-soft"
          >
            {item.label}
          </Link>
        ))}
        {viewer ? (
          <Link
            href="/dashboard"
            className="min-h-touch rounded-control px-4 py-3 font-semibold hover:bg-accent-soft"
          >
            Dashboard
          </Link>
        ) : null}
        {isAdmin ? (
          <Link
            href="/admin/reports"
            className="min-h-touch rounded-control px-4 py-3 font-semibold hover:bg-accent-soft"
          >
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-3.5">
        <ThemeSwitch />

        {viewer ? (
          <>
            {viewer.track ? (
              <span className="hidden rounded-full bg-accent-soft px-4 py-2 text-[0.95em] font-semibold text-accent-dark lg:inline-flex">
                Your track: {TRACK_LABEL[viewer.track]}
              </span>
            ) : null}
            <NotificationBell />
            <ButtonLink href="/account" variant="outline" size="md">
              Account
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/login" variant="outline" size="md">
            Log in
          </ButtonLink>
        )}

        <AccessibilityPanel />
      </div>
    </header>
  );
}
