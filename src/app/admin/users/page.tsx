import type { Metadata } from "next";
import Link from "next/link";

import { filterQuery, RosterFilters } from "@/components/admin/roster-filters";
import { RosterTable } from "@/components/admin/roster-table";
import { DownloadIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { getRoster } from "@/lib/queries";
import { stripEmpty } from "@/lib/search-params";
import { rosterFilterSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Members" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const filter = rosterFilterSchema.parse(stripEmpty(raw));
  const roster = await getRoster(filter);
  const query = filterQuery(filter);

  return (
    <Card>
      <SectionHeading title="All members">
        <Link
          href={`/admin/users/print${query ? `?${query}` : ""}`}
          target="_blank"
          rel="noopener"
          className={buttonClass("outline", "sm", "border-accent text-accent-dark")}
        >
          <DownloadIcon /> Download PDF
        </Link>
      </SectionHeading>

      <RosterFilters action="/admin/users" filter={filter} />

      <p className="m-0 mb-3 text-muted">
        Showing {roster.length} {roster.length === 1 ? "member" : "members"}
      </p>

      <RosterTable rows={roster} columns="full" />
    </Card>
  );
}
