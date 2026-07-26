"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setVideoAccess, setVideoStatus } from "@/actions/admin";
import { VideoStatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import {
  ACCESS_LABEL,
  ACCESS_LEVELS,
  STATUS_LABEL,
  VIDEO_STATUSES,
  type AccessLevel,
  type VideoStatus,
} from "@/lib/domain";

type Row = {
  id: string;
  title: string;
  categoryName: string;
  masterName: string | null;
  levelName: string | null;
  durationLabel: string;
  access: AccessLevel;
  status: VideoStatus;
};

const th =
  "border-b-2 border-line px-3 py-3 text-left font-bold text-[0.92em] text-muted whitespace-nowrap";
const td = "border-b border-line px-3 py-3.5 align-middle";

/**
 * Catalog management (spec §6.10). Access and status are inline selects backed
 * by Server Actions; moving a video into PUBLISHED fans out notifications, and
 * the result message reports how many members were told.
 */
export function CatalogTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function changeAccess(videoId: string, access: AccessLevel) {
    setPendingId(videoId);
    startTransition(async () => {
      const result = await setVideoAccess({ videoId, access });
      setPendingId(null);
      setMessage(result.ok ? `Access level updated to ${ACCESS_LABEL[access]}.` : (result.message ?? null));
      router.refresh();
    });
  }

  function changeStatus(videoId: string, status: VideoStatus) {
    setPendingId(videoId);
    startTransition(async () => {
      const result = await setVideoStatus({ videoId, status });
      setPendingId(null);
      setMessage(result.message ?? `Status updated to ${STATUS_LABEL[status]}.`);
      router.refresh();
    });
  }

  return (
    <>
      {message ? (
        <p
          className="mb-4 rounded-control border-2 border-line bg-bg px-4 py-3 font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[1.02em]">
          <caption className="sr-only">Video catalog with access level and status</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                Title
              </th>
              <th scope="col" className={th}>
                Category
              </th>
              <th scope="col" className={th}>
                Master
              </th>
              <th scope="col" className={th}>
                Level
              </th>
              <th scope="col" className={th}>
                Duration
              </th>
              <th scope="col" className={th}>
                Access level
              </th>
              <th scope="col" className={th}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={td} colSpan={7}>
                  No videos yet. Use “Upload video” to add the first one.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className={td}>
                    <Link
                      href={`/admin/videos/${row.id}`}
                      className="font-bold text-accent-dark underline underline-offset-2"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className={td}>{row.categoryName}</td>
                  <td className={td}>{row.masterName ?? "—"}</td>
                  <td className={td}>{row.levelName ?? "—"}</td>
                  <td className={td}>{row.durationLabel}</td>
                  <td className={td}>
                    <label className="sr-only" htmlFor={`access-${row.id}`}>
                      Access level for {row.title}
                    </label>
                    <Select
                      id={`access-${row.id}`}
                      value={row.access}
                      disabled={pendingId === row.id}
                      onChange={(event) =>
                        changeAccess(row.id, event.target.value as AccessLevel)
                      }
                      className="w-auto min-w-[130px] py-2"
                    >
                      {ACCESS_LEVELS.map((access) => (
                        <option key={access} value={access}>
                          {ACCESS_LABEL[access]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <VideoStatusBadge status={row.status} />
                      <label className="sr-only" htmlFor={`status-${row.id}`}>
                        Status for {row.title}
                      </label>
                      <Select
                        id={`status-${row.id}`}
                        value={row.status}
                        disabled={pendingId === row.id}
                        onChange={(event) =>
                          changeStatus(row.id, event.target.value as VideoStatus)
                        }
                        className="w-auto min-w-[140px] py-2"
                      >
                        {VIDEO_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABEL[status]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
