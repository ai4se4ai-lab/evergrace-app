import { redirect } from "next/navigation";

import { signOut } from "@/actions/auth";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";

/**
 * Admin shell. The role is re-checked here (not only in middleware) and again in
 * every admin Server Action — spec §5.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/admin/login");
  if (viewer.role !== "ADMIN") redirect("/dashboard");

  return (
    <main className="mx-auto max-w-[1280px] px-7 pb-20 pt-8 print:max-w-none print:p-0">
      {/* Console chrome is hidden when printing, so the nested print routes
          render as a clean sheet (see PrintSheet). */}
      <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-[2.2em]">Admin Console</h1>
          <p className="m-0 mt-1 text-[1.1em] text-muted">
            Manage videos, members, and program impact.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <AdminTabs />

      {children}
    </main>
  );
}
