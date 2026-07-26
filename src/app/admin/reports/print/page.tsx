import type { Metadata } from "next";

import { filterNote } from "@/components/admin/roster-filters";
import { PrintSheet } from "@/components/admin/print-sheet";
import { requireAdmin } from "@/lib/auth";
import { lastActiveLabel, MEMBER_STATUS_LABEL, PLAN_LABEL, TRACK_LABEL } from "@/lib/domain";
import { getRoster } from "@/lib/queries";
import { stripEmpty } from "@/lib/search-params";
import { rosterFilterSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Member progress report" };

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();

  const filter = rosterFilterSchema.parse(stripEmpty(await searchParams));
  const roster = await getRoster(filter);

  return (
    <PrintSheet
      title="Member Progress Report"
      filterNote={filterNote(filter)}
      headers={["Name", "Age", "Class", "Plan", "Sessions", "Progress", "Last active", "Status"]}
      rows={roster.map((row) => [
        row.name,
        row.age === null ? "—" : String(row.age),
        row.track ? TRACK_LABEL[row.track] : "—",
        PLAN_LABEL[row.plan],
        String(row.sessions),
        `${row.progress}%`,
        lastActiveLabel(row.lastActiveAt),
        MEMBER_STATUS_LABEL[row.status],
      ])}
    />
  );
}
