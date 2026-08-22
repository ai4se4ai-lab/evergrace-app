import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Button styling ported from the prototype. Every size clears the 44px minimum
 * target height; primary calls to action are 52–64px (spec §3).
 */

export type ButtonVariant = "primary" | "outline" | "ghost" | "dark" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "hero";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-control font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white border-2 border-transparent hover:bg-accent-dark",
  outline: "bg-transparent text-fg border-2 border-line hover:bg-accent-soft",
  ghost: "bg-transparent text-fg border-2 border-transparent hover:bg-accent-soft",
  dark: "bg-fg text-bg border-2 border-transparent hover:opacity-90",
  danger: "bg-transparent text-muted border-2 border-line hover:bg-accent-soft",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-touch px-4 py-2.5 text-[0.98em]",
  md: "min-h-control px-[22px] py-3.5 text-[1.05em]",
  lg: "min-h-[56px] px-7 py-4 text-[1.1em]",
  hero: "min-h-hero px-[34px] py-5 text-[1.25em] rounded-[14px]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** The prototype's underlined inline text button. */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "font-bold text-accent-dark underline decoration-1 underline-offset-[3px] hover:text-accent",
        className,
      )}
      {...props}
    />
  );
}
