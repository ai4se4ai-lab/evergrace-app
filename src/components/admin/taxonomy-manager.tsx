"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";

import { ConfirmButton } from "@/components/admin/confirm-button";

import { PlusIcon } from "@/components/icons";
import { useDataRefresh } from "@/components/admin/use-data-refresh";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export type TaxonomyRow = {
  id: string;
  name: string;
  /** `blurb` for a focus area, `style` for an instructor. */
  detail: string | null;
  videoCount: number;
  followCount: number;
};

/**
 * Shared CRUD screen for focus areas (Category) and instructors (Master). They
 * have the same shape — a name, one descriptive field, and usage counts that
 * decide whether deletion is safe — so they share one component rather than two
 * near-identical ones.
 */
export function TaxonomyManager({
  kind,
  rows,
  onSave,
  onDelete,
}: {
  kind: "category" | "master";
  rows: TaxonomyRow[];
  onSave: (input: {
    id?: string;
    name: string;
    detail: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const refresh = useDataRefresh();
  const [editing, setEditing] = useState<TaxonomyRow | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const copy =
    kind === "category"
      ? {
          heading: "Focus areas",
          blurb:
            "The categories members filter and follow by. Every video belongs to exactly one.",
          singular: "focus area",
          detailLabel: "Short description",
          detailHint: "Shown on the landing page card.",
          detailPlaceholder: "Steady your body and quiet the fear of falling.",
          namePlaceholder: "e.g. Balance",
        }
      : {
          heading: "Instructors",
          blurb: "The masters credited on sessions. Members can follow any of them.",
          singular: "instructor",
          detailLabel: "Style",
          detailHint: "Shown beside their name in the subscriptions card.",
          detailPlaceholder: "Tai Chi & Balance",
          namePlaceholder: "e.g. Kenneth Brake",
        };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 mb-1 text-[1.4em]">{copy.heading}</h2>
          <p className="m-0 max-w-[56ch] text-muted">{copy.blurb}</p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusIcon /> New {copy.singular}
        </Button>
      </div>

      {message ? (
        <p
          className="mb-4 rounded-control border-2 border-line bg-bg px-4 py-3 font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.length === 0 ? (
          <li className="text-muted">Nothing here yet.</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-4 rounded-card border-2 border-line bg-bg px-5 py-4"
            >
              <div className="min-w-[200px] flex-1">
                <div className="text-[1.15em] font-bold">{row.name}</div>
                {row.detail ? <div className="text-muted">{row.detail}</div> : null}
              </div>

              <div className="flex gap-5 text-[0.95em] text-muted">
                <span>
                  {row.videoCount} video{row.videoCount === 1 ? "" : "s"}
                </span>
                <span>
                  {row.followCount} follower{row.followCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                  Edit
                </Button>
                <ConfirmButton
                  label="Delete"
                  title={`Delete “${row.name}”?`}
                  description={
                    row.videoCount > 0
                      ? `${row.videoCount} video(s) still use this ${copy.singular}. You'll need to reassign them first — this will tell you if so.`
                      : row.followCount > 0
                        ? `This also removes ${row.followCount} member follow(s).`
                        : `This removes the ${copy.singular}.`
                  }
                  onConfirm={async () => {
                    const result = await onDelete(row.id);
                    setMessage(result.message ?? null);
                    if (result.ok) refresh();
                    return result;
                  }}
                />
              </div>
            </li>
          ))
        )}
      </ul>

      <EditDialog
        editing={editing}
        copy={copy}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          const result = await onSave(input);
          setMessage(result.message ?? null);
          if (result.ok) refresh();
          return result;
        }}
      />
    </div>
  );
}

function EditDialog({
  editing,
  copy,
  onClose,
  onSave,
}: {
  editing: TaxonomyRow | "new" | null;
  copy: {
    singular: string;
    detailLabel: string;
    detailHint: string;
    detailPlaceholder: string;
    namePlaceholder: string;
  };
  onClose: () => void;
  onSave: (input: {
    id?: string;
    name: string;
    detail: string;
  }) => Promise<{ ok: boolean; message?: string }>;
}) {
  const isNew = editing === "new";
  const row = isNew ? null : editing;

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await onSave({
        id: row?.id,
        name: String(formData.get("name") ?? ""),
        detail: String(formData.get("detail") ?? ""),
      });
      if (!result.ok) {
        setError(result.message ?? "Please check the details.");
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog.Root open={editing !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(20,17,14,.55)]" />
        <Dialog.Content className="animate-fadeup fixed left-1/2 top-1/2 z-[81] w-[520px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border-2 border-line bg-surface p-8">
          <Dialog.Title className="m-0 mb-1.5 text-[1.6em]">
            {isNew ? `New ${copy.singular}` : `Edit ${copy.singular}`}
          </Dialog.Title>
          <Dialog.Description className="m-0 mb-6 text-muted">
            Members see this name on filters, cards, and their subscriptions.
          </Dialog.Description>

          {/* Remount on target change so defaultValue tracks the selected row. */}
          <form action={submit} key={row?.id ?? "new"}>
            <Field label="Name" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                defaultValue={row?.name ?? ""}
                placeholder={copy.namePlaceholder}
              />
            </Field>

            <Field
              label={copy.detailLabel}
              htmlFor="detail"
              className="mt-4"
              hint={copy.detailHint}
            >
              <Input
                id="detail"
                name="detail"
                defaultValue={row?.detail ?? ""}
                placeholder={copy.detailPlaceholder}
              />
            </Field>

            {error ? (
              <p className="mt-4 font-semibold text-warn" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="outline" size="md">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" size="md" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
