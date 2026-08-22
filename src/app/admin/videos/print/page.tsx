import type { Metadata } from "next";

import { PrintSheet } from "@/components/admin/print-sheet";
import { requireAdmin } from "@/lib/auth";
import { ACCESS_LABEL, STATUS_LABEL } from "@/lib/domain";
import { getAdminCatalog } from "@/lib/queries";

export const metadata: Metadata = { title: "Video catalog" };

export default async function VideosPrintPage() {
  await requireAdmin();
  const rows = await getAdminCatalog();

  return (
    <PrintSheet
      title="Video Catalog"
      filterNote=" · All videos"
      headers={["Title", "Category", "Master", "Level", "Duration", "Access level", "Status"]}
      rows={rows.map((row) => [
        row.title,
        row.categoryName,
        row.masterName ?? "—",
        row.levelName ?? "—",
        row.durationLabel,
        ACCESS_LABEL[row.access],
        STATUS_LABEL[row.status],
      ])}
    />
  );
}
