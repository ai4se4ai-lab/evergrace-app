"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";

import { deleteTeamMember, reorderTeam, saveTeamMember } from "@/actions/admin-content";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PlusIcon } from "@/components/icons";
import { useDataRefresh } from "@/components/admin/use-data-refresh";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export type TeamRow = {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  photoUrl: string | null;
};

/** Team CRUD for the About page, ordered with keyboard-operable ↑/↓ controls. */
export function TeamManager({ team }: { team: TeamRow[] }) {
  const refresh = useDataRefresh();
  const [editing, setEditing] = useState<TeamRow | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const next = [...team];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    startTransition(async () => {
      await reorderTeam({ orderedIds: next.map((row) => row.id) });
      refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 mb-1 text-[1.4em]">Team</h2>
          <p className="m-0 max-w-[56ch] text-muted">
            Shown on the About page in this order. Without a photo, the initials
            placeholder is used.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusIcon /> New team member
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
        {team.length === 0 ? (
          <li className="text-muted">No team members yet.</li>
        ) : (
          team.map((row, index) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start gap-4 rounded-card border-2 border-line bg-bg px-5 py-4"
            >
              <span
                className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-accent font-extrabold text-white"
                aria-hidden
              >
                {row.initials || row.name.slice(0, 2).toUpperCase()}
              </span>

              <div className="min-w-[220px] flex-1">
                <div className="text-[1.15em] font-bold">{row.name}</div>
                <div className="font-semibold text-accent-dark">{row.role}</div>
                <p className="m-0 mt-1 text-muted">{row.bio}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${row.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${row.name} down`}
                  disabled={index === team.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                  Edit
                </Button>
                <ConfirmButton
                  label="Remove"
                  title={`Remove ${row.name}?`}
                  description="They disappear from the About page immediately."
                  onConfirm={async () => {
                    const result = await deleteTeamMember(row.id);
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

      <TeamDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(text) => {
          setMessage(text);
          refresh();
        }}
      />
    </div>
  );
}

function TeamDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: TeamRow | "new" | null;
  onClose: () => void;
  onSaved: (message: string | null) => void;
}) {
  const isNew = editing === "new";
  const member = isNew ? null : editing;

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveTeamMember({
        id: member?.id,
        name: formData.get("name"),
        role: formData.get("role"),
        bio: formData.get("bio"),
        initials: formData.get("initials") || undefined,
        photoUrl: formData.get("photoUrl") || "",
      });

      if (!result.ok) {
        setError(result.message ?? "Please check the details.");
        return;
      }
      onSaved(result.message ?? null);
      onClose();
    });
  }

  return (
    <Dialog.Root open={editing !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(20,17,14,.55)]" />
        <Dialog.Content className="animate-fadeup fixed left-1/2 top-1/2 z-[81] max-h-[90vh] w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border-2 border-line bg-surface p-8">
          <Dialog.Title className="m-0 mb-1.5 text-[1.6em]">
            {isNew ? "New team member" : `Edit ${member?.name}`}
          </Dialog.Title>
          <Dialog.Description className="m-0 mb-6 text-muted">
            Name, role, and a short line about what they do.
          </Dialog.Description>

          <form action={submit} key={member?.id ?? "new"}>
            <Field label="Name" htmlFor="name">
              <Input id="name" name="name" required defaultValue={member?.name ?? ""} />
            </Field>

            <Field label="Role" htmlFor="role" className="mt-4">
              <Input
                id="role"
                name="role"
                required
                defaultValue={member?.role ?? ""}
                placeholder="Head Martial Arts Instructor"
              />
            </Field>

            <Field label="Bio" htmlFor="bio" className="mt-4">
              <Textarea id="bio" name="bio" required rows={4} defaultValue={member?.bio ?? ""} />
            </Field>

            <div className="mt-4 grid gap-3.5 sm:grid-cols-[140px_1fr]">
              <Field
                label="Initials"
                htmlFor="initials"
                hint="Optional — derived from the name."
              >
                <Input
                  id="initials"
                  name="initials"
                  maxLength={3}
                  defaultValue={member?.initials ?? ""}
                />
              </Field>

              <Field label="Photo URL (optional)" htmlFor="photoUrl">
                <Input
                  id="photoUrl"
                  name="photoUrl"
                  type="url"
                  defaultValue={member?.photoUrl ?? ""}
                />
              </Field>
            </div>

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
