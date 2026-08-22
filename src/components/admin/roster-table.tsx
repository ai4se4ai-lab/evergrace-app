import Link from "next/link";

import { MemberStatusBadge, PlanBadge } from "@/components/ui/badge";
import { lastActiveLabel, TRACK_LABEL } from "@/lib/domain";
import type { RosterRow } from "@/lib/queries";

const th =
  "border-b-2 border-line px-3 py-3 text-left font-bold text-[0.92em] text-muted whitespace-nowrap";
const td = "border-b border-line px-3 py-3.5 align-middle";

/** Member roster / progress report table. Read-only in v1 (spec §6.11). */
export function RosterTable({
  rows,
  columns = "full",
}: {
  rows: RosterRow[];
  columns?: "full" | "progress";
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[1.02em]">
        <caption className="sr-only">
          Member roster with age, class, plan, progress and status
        </caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Name
            </th>
            <th scope="col" className={th}>
              Age
            </th>
            <th scope="col" className={th}>
              Class
            </th>
            <th scope="col" className={th}>
              Plan
            </th>
            {columns === "progress" ? (
              <th scope="col" className={th}>
                Sessions
              </th>
            ) : (
              <th scope="col" className={th}>
                Joined
              </th>
            )}
            <th scope="col" className={th}>
              Progress
            </th>
            <th scope="col" className={th}>
              {columns === "progress" ? "Last active" : "Status"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={td} colSpan={7}>
                No members match those filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>
                  {/* The print sheet renders its own table, so linking here is
                      safe — it never appears in an export. */}
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="font-bold text-accent-dark underline underline-offset-2"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className={td}>{row.age ?? "—"}</td>
                <td className={td}>{row.track ? TRACK_LABEL[row.track] : "—"}</td>
                <td className={td}>
                  <PlanBadge plan={row.plan} />
                </td>
                {columns === "progress" ? (
                  <td className={td}>{row.sessions}</td>
                ) : (
                  <td className={td}>
                    {row.joined.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </td>
                )}
                <td className={td}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-20 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${row.progress}%` }}
                      />
                    </span>
                    {row.progress}%
                  </span>
                </td>
                <td className={td}>
                  {columns === "progress" ? (
                    lastActiveLabel(row.lastActiveAt)
                  ) : (
                    <MemberStatusBadge status={row.status} />
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
