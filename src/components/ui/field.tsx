import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const control =
  "w-full rounded-control border-2 border-line bg-bg px-4 py-3 text-fg placeholder:text-muted/70";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-2 block font-semibold", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "min-h-touch", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "min-h-touch font-semibold", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-[80px] resize-y", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-[0.92em] text-muted">{hint}</p> : null}
      {error ? (
        <p className="mt-1.5 font-semibold text-[0.92em] text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
