import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PLANS, PLAN_LABEL, TRACKS, TRACK_LABEL } from "@/lib/domain";
import type { RosterFilter } from "@/lib/validation";

/**
 * Filters are a plain GET form, so the resulting view is a shareable URL and
 * the PDF/print route can reproduce exactly the same rows (spec §6.9).
 */
export function RosterFilters({
  action,
  filter,
}: {
  action: string;
  filter: RosterFilter;
}) {
  const hasFilters = Object.values(filter).some((value) => value !== undefined && value !== "");

  return (
    <form
      method="get"
      action={action}
      className="mb-5 flex flex-wrap items-end gap-3.5"
      role="search"
    >
      <Field label="Search name" htmlFor="name" className="min-w-[180px] flex-1">
        <Input id="name" name="name" defaultValue={filter.name ?? ""} placeholder="e.g. Margaret" />
      </Field>

      <Field label="Class / track" htmlFor="track" className="min-w-[170px]">
        <Select id="track" name="track" defaultValue={filter.track ?? ""}>
          <option value="">All classes</option>
          {TRACKS.map((track) => (
            <option key={track} value={track}>
              {TRACK_LABEL[track]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Plan" htmlFor="plan" className="min-w-[150px]">
        <Select id="plan" name="plan" defaultValue={filter.plan ?? ""}>
          <option value="">All plans</option>
          {PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {PLAN_LABEL[plan]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Min age" htmlFor="ageMin" className="min-w-[110px]">
        <Input
          id="ageMin"
          name="ageMin"
          type="number"
          min={0}
          max={130}
          defaultValue={filter.ageMin ?? ""}
        />
      </Field>

      <Field label="Max age" htmlFor="ageMax" className="min-w-[110px]">
        <Input
          id="ageMax"
          name="ageMax"
          type="number"
          min={0}
          max={130}
          defaultValue={filter.ageMax ?? ""}
        />
      </Field>

      <Button type="submit" size="sm">
        Apply filters
      </Button>

      {hasFilters ? (
        <Link href={action} className="min-h-touch px-2 py-2.5 font-bold text-accent-dark underline">
          Clear
        </Link>
      ) : null}
    </form>
  );
}

/** Turns a filter back into a query string for the print route. */
export function filterQuery(filter: RosterFilter): string {
  const params = new URLSearchParams();
  if (filter.name) params.set("name", filter.name);
  if (filter.track) params.set("track", filter.track);
  if (filter.plan) params.set("plan", filter.plan);
  if (filter.ageMin !== undefined) params.set("ageMin", String(filter.ageMin));
  if (filter.ageMax !== undefined) params.set("ageMax", String(filter.ageMax));
  return params.toString();
}

/** Human-readable summary of the active filters, printed on the PDF header. */
export function filterNote(filter: RosterFilter): string {
  const parts: string[] = [];
  if (filter.name) parts.push(`name “${filter.name}”`);
  if (filter.track) parts.push(`class ${TRACK_LABEL[filter.track as keyof typeof TRACK_LABEL]}`);
  if (filter.plan) parts.push(`plan ${PLAN_LABEL[filter.plan as keyof typeof PLAN_LABEL]}`);
  if (filter.ageMin !== undefined || filter.ageMax !== undefined) {
    parts.push(`age ${filter.ageMin ?? 0}–${filter.ageMax ?? "∞"}`);
  }
  return parts.length > 0 ? ` · Filtered by ${parts.join(", ")}` : " · All members";
}
