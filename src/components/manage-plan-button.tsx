"use client";

import { ArrowUpIcon } from "@/components/icons";
import { usePlanModal } from "@/components/plan-modal";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/** Opens the plan modal from a Server Component page. */
export function ManagePlanButton({
  label = "Manage / upgrade plan",
  variant = "primary",
  size = "lg",
  className,
}: {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const planModal = usePlanModal();

  return (
    <Button variant={variant} size={size} className={className} onClick={() => planModal.open()}>
      <ArrowUpIcon />
      {label}
    </Button>
  );
}
