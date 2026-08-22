import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin sign-in" };

/**
 * Lives in the `(staff-auth)` route group, NOT under `app/admin/`, so it is
 * outside `app/admin/layout.tsx`. That layout redirects anyone without an admin
 * session to this page — if the login page were inside it, signing in would be
 * impossible: the layout would bounce an anonymous visitor to /admin/login,
 * which would render the layout again, forever. The URL is still /admin/login,
 * because route groups don't appear in the path.
 */
export default async function AdminLoginPage() {
  const viewer = await getViewer();
  if (viewer?.role === "ADMIN") redirect("/admin/reports");

  return (
    <main className="mx-auto max-w-[520px] px-7 pb-[90px] pt-16">
      <div className="rounded-[20px] border-2 border-line bg-surface px-10 py-11">
        <div
          className="mx-auto mb-[22px] flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-fg text-[1.5em] font-bold text-bg"
          aria-hidden
        >
          道
        </div>
        <h1 className="m-0 mb-2 text-center text-[2.1em]">Admin sign-in</h1>
        <p className="mx-auto mb-7 max-w-[38ch] text-center text-[1.1em] text-muted">
          Restricted area. Staff credentials required.
        </p>

        <AdminLoginForm />

        <p className="mt-5 text-center">
          <Link href="/" className="text-muted underline">
            Back to site
          </Link>
        </p>
      </div>
    </main>
  );
}
