"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/**
 * Destructive actions always go through a confirmation naming what will happen.
 * The admin console has real delete paths (videos, chapters, posts), and this
 * audience should never lose content to a mis-tap.
 */
export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  variant = "danger",
  size = "sm",
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<{ ok: boolean; message?: string }>;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.message ?? "That didn’t work.");
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant={variant} size={size}>
          {label}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[85] bg-[rgba(20,17,14,.55)]" />
        <Dialog.Content className="animate-fadeup fixed left-1/2 top-1/2 z-[86] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border-2 border-line bg-surface p-8">
          <Dialog.Title className="m-0 mb-2 text-[1.5em]">{title}</Dialog.Title>
          <Dialog.Description className="m-0 mb-6 text-[1.05em] text-muted">
            {description}
          </Dialog.Description>

          {error ? (
            <p
              className="mb-4 rounded-control border-2 border-[var(--notice-line)] bg-[var(--notice-bg)] px-4 py-3 font-semibold text-[var(--notice-fg)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" size="md">
                Cancel
              </Button>
            </Dialog.Close>
            <Button variant="dark" size="md" disabled={pending} onClick={confirm}>
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
