import Link from "next/link";

import { site } from "@/content/site";

const LINKS = [
  { href: "/library", label: "Video library" },
  { href: "/about", label: "About us" },
  { href: "/blog", label: site.journal },
  { href: "/onboarding", label: "Health check-in" },
  { href: "/login", label: "Member log in" },
  { href: "/admin/login", label: "Staff sign-in" },
];

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto border-t-2 border-line bg-surface">
      <div className="shell flex flex-wrap items-start justify-between gap-8 py-10">
        <div className="max-w-[38ch]">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-[1.2em] font-bold text-white"
              aria-hidden
            >
              道
            </span>
            <span className="font-display text-[1.2em] font-extrabold">{site.name}</span>
          </div>
          <p className="mt-4 text-muted">
            {site.tagline}. Balance, breathing, and safe self-defense for older adults practicing at
            home.
          </p>
        </div>

        <nav aria-label="Footer" className="grid gap-2 sm:grid-cols-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="min-h-touch rounded-control px-2 py-2.5 font-semibold hover:bg-accent-soft"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="shell m-0 py-5 text-[0.95em] text-muted">
          This is a course project built for COMP 370. Always talk to your doctor before starting a
          new exercise programme.
        </p>
      </div>
    </footer>
  );
}
