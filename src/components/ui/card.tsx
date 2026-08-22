import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[20px] border-2 border-line bg-surface p-7", className)}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="rounded-[18px] border-2 border-line bg-surface p-6">
      <div className="mb-2 font-semibold text-muted">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-[2.8em] font-bold leading-none text-accent">{value}</span>
        {unit ? <span className="text-[1.05em] text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <h2 className="m-0 text-[1.4em]">{title}</h2>
        {description ? <p className="m-0 mt-1 text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Hatched stand-in wherever production photography or video art will go. */
export function PlaceholderArt({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("placeholder-art relative flex items-center justify-center", className)}
      aria-hidden={!label}
    >
      {children}
      {label ? <span className="hatch-label absolute bottom-4 left-4">{label}</span> : null}
    </div>
  );
}
