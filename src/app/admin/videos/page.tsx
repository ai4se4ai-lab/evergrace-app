import type { Metadata } from "next";
import Link from "next/link";

import { CatalogTable } from "@/components/admin/catalog-table";
import { VideoSubTabs } from "@/components/admin/video-sub-tabs";
import { DownloadIcon, PlusIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAdminCatalog } from "@/lib/queries";

export const metadata: Metadata = { title: "Videos" };

export default async function AdminVideosPage() {
  const [rows, levelCount] = await Promise.all([getAdminCatalog(), prisma.level.count()]);

  return (
    <div>
      <VideoSubTabs levelCount={levelCount} />

      <Card>
        <SectionHeading title={`Video catalog (${rows.length})`}>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/videos/print"
              target="_blank"
              rel="noopener"
              className={buttonClass("outline", "sm", "border-accent text-accent-dark")}
            >
              <DownloadIcon /> Download PDF
            </Link>
            <Link href="/admin/videos/upload" className={buttonClass("primary", "sm")}>
              <PlusIcon /> Upload video
            </Link>
          </div>
        </SectionHeading>

        <CatalogTable rows={rows} />
      </Card>
    </div>
  );
}
