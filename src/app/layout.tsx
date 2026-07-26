import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";

import "./globals.css";

import { AppProviders } from "@/components/app-providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PREFERENCES_COOKIE, parsePreferences } from "@/lib/preferences";

export const metadata: Metadata = {
  title: {
    default: "EverGrace — gentle martial arts for a stronger, steadier you",
    template: "%s · EverGrace",
  },
  description:
    "Balance, breathing, and safe self-defense — taught slowly and clearly, designed for older adults practicing at home.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Resolves `theme: "auto"` before first paint so an auto-mode visitor never
 * sees a flash of the wrong palette. This is a fixed string literal with no
 * interpolation — nothing user-supplied reaches it.
 */
const themeScript = `(function(){try{var r=document.documentElement;if(r.getAttribute("data-theme-pref")!=="auto")return;var d=window.matchMedia("(prefers-color-scheme: dark)").matches;r.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [store, viewer] = await Promise.all([cookies(), getViewer()]);

  // A signed-in member's saved preferences win over the cookie; the cookie is
  // the only source for anonymous visitors (spec §7).
  let preferences = parsePreferences(store.get(PREFERENCES_COOKIE)?.value);
  if (viewer) {
    const row = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: { preferences: true },
    });
    if (row?.preferences && row.preferences !== "{}") {
      preferences = parsePreferences(row.preferences);
    }
  }

  const resolvedTheme = preferences.theme === "auto" ? "light" : preferences.theme;

  return (
    <html
      lang="en"
      data-theme={resolvedTheme}
      data-theme-pref={preferences.theme}
      data-contrast={preferences.highContrast ? "high" : "normal"}
      data-text-size={preferences.textSize}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Baloo+2:wght@500;600;700;800&display=swap"
        />
        <Script id="evergrace-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body>
        <AppProviders preferences={preferences} viewer={viewer}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-accent focus:px-5 focus:py-3 focus:font-bold focus:text-white"
          >
            Skip to main content
          </a>
          <SiteHeader viewer={viewer} />
          <div id="main">{children}</div>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
