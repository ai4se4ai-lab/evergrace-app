import {
  ACCESS_LABEL,
  MEMBER_STATUS_LABEL,
  PLAN_LABEL,
  STATUS_LABEL,
  type AccessLevel,
  type MemberStatus,
  type Plan,
  type VideoStatus,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

const pill =
  "inline-block rounded-full px-3 py-[3px] text-[0.8em] font-bold whitespace-nowrap";

/**
 * Access tier badge — the prototype's `accessBadgeStyle()`. Colour is never the
 * only signal: the tier name is always spelled out (spec §7).
 */
export function AccessBadge({
  access,
  className,
}: {
  access: AccessLevel;
  className?: string;
}) {
  const tone = {
    FREE: "bg-success-soft text-success",
    MEMBERS: "bg-accent-soft text-accent-dark",
    PREMIUM: "bg-warn-soft text-warn",
  }[access];

  return <span className={cn(pill, tone, className)}>{ACCESS_LABEL[access]}</span>;
}

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  const tone = {
    PUBLISHED: "bg-success-soft text-success",
    PROCESSING: "bg-warn-soft text-warn",
    DRAFT: "bg-line text-muted",
  }[status];

  return <span className={cn(pill, "px-3 py-1 text-[0.88em]", tone)}>{STATUS_LABEL[status]}</span>;
}

export function PlanBadge({ plan, className }: { plan: Plan; className?: string }) {
  const tone = {
    BASIC: "bg-line text-muted",
    MEMBER: "bg-accent-soft text-accent-dark",
    PREMIUM: "bg-warn-soft text-warn",
  }[plan];

  return (
    <span className={cn(pill, "px-3 py-1 text-[0.88em]", tone, className)}>
      {PLAN_LABEL[plan]}
    </span>
  );
}

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const tone = {
    ACTIVE: "bg-success-soft text-success",
    AT_RISK: "bg-warn-soft text-warn",
    INACTIVE: "bg-line text-muted",
  }[status];

  return (
    <span className={cn(pill, "px-3 py-1 text-[0.88em]", tone)}>
      {MEMBER_STATUS_LABEL[status]}
    </span>
  );
}

/** The soft accent "eyebrow" pill used above page headings. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-accent-soft px-4 py-2 font-semibold text-accent-dark">
      {children}
    </span>
  );
}
