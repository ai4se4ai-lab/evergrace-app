import type { Metadata } from "next";
import Link from "next/link";

import { filterQuery, RosterFilters } from "@/components/admin/roster-filters";
import { RosterTable } from "@/components/admin/roster-table";
import { SignupsBarChart } from "@/components/charts/signups-bar-chart";
import { DownloadIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { getReportSummary, getRoster } from "@/lib/queries";
import { stripEmpty } from "@/lib/search-params";
import { rosterFilterSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Reports & impact" };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const filter = rosterFilterSchema.parse(stripEmpty(raw));

  const [summary, roster] = await Promise.all([getReportSummary(), getRoster(filter)]);
  const query = filterQuery(filter);

  return (
    <div>
      <div className="mb-7 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total members" value={summary.totalMembers.toLocaleString("en-US")} />
        <Kpi label="Active this week" value={summary.activeThisWeek.toLocaleString("en-US")} />
        <Kpi label="Avg. progress" value={`${summary.averageProgress}%`} />
        <Kpi label="Retention (30d)" value={`${summary.retention30}%`} />
      </div>

      <Card className="mb-7">
        <h2 className="m-0 mb-1 text-[1.4em]">New members per month</h2>
        <p className="m-0 mb-5 text-muted">Sign-up growth over the last 8 months.</p>
        <SignupsBarChart data={summary.signupsByMonth} />
      </Card>

      <Card>
        <SectionHeading title="Member progress report">
          <Link
            href={`/admin/reports/print${query ? `?${query}` : ""}`}
            target="_blank"
            rel="noopener"
            className={buttonClass("outline", "sm", "text-accent-dark border-accent")}
          >
            <DownloadIcon /> Download PDF
          </Link>
        </SectionHeading>

        <RosterFilters action="/admin/reports" filter={filter} />

        <p className="m-0 mb-3 text-muted">
          Showing {roster.length} {roster.length === 1 ? "member" : "members"}
        </p>

        <RosterTable rows={roster} columns="progress" />
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border-2 border-line bg-surface p-[22px]">
      <div className="mb-1.5 font-semibold text-muted">{label}</div>
      <div className="text-[2.4em] font-bold leading-none text-accent">{value}</div>
    </div>
  );
}
