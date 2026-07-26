"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteLevel, reorderLevels, saveLevel } from "@/actions/admin";
import { PlayIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

type Level = {
  id: string;
  name: string;
  description: string;
  badge: string;
  videos: { id: string; title: string; durationLabel: string }[];
};

type VideoOption = { id: string; title: string; durationLabel: string; levelId: string | null };

/**
 * Skill-level builder (spec §6.10): create / edit / remove levels, assign
 * videos, and reorder the progression. Reordering uses explicit up/down buttons
 * rather than drag-and-drop — keyboard-operable and touch-friendly, which
 * matters more for this audience than the drag affordance.
 */
export function LevelBuilder({
  levels,
  allVideos,
}: {
  levels: Level[];
  allVideos: VideoOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Level | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const next = [...levels];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    startTransition(async () => {
      await reorderLevels({ orderedIds: next.map((level) => level.id) });
      router.refresh();
    });
  }

  function remove(level: Level) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteLevel(level.id);
      setMessage(
        result.ok
          ? `Removed “${level.name}”. Its videos are still in the catalog, just unassigned.`
          : (result.message ?? null),
      );
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 mb-1 text-[1.4em]">Skill levels</h2>
          <p className="m-0 max-w-[56ch] text-muted">
            Group videos into a progression. Each level combines techniques that build on the last,
            getting more advanced as members move up.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusIcon /> New level
        </Button>
      </div>

      {message ? (
        <p
          className="mt-4 rounded-control border-2 border-line bg-bg px-4 py-3 font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <ul role="list" className="m-0 mt-6 flex list-none flex-col gap-4 p-0">
        {levels.length === 0 ? (
          <li className="text-muted">No levels yet. Create Level 0 to start the ladder.</li>
        ) : (
          levels.map((level, index) => (
            <li
              key={level.id}
              className="flex flex-wrap items-start gap-[18px] rounded-card border-2 border-line bg-bg px-[22px] py-5"
            >
              <div
                className="flex h-[66px] w-[66px] flex-none flex-col items-center justify-center rounded-[14px] bg-accent leading-none text-white"
                aria-hidden
              >
                <span className="text-[0.62em] font-bold tracking-[.08em] opacity-85">LEVEL</span>
                <span className="text-[1.7em] font-extrabold">{index}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="m-0 text-[1.25em]">{level.name}</h3>
                  <span className="font-semibold text-[0.95em] text-muted">
                    {level.videos.length} {level.videos.length === 1 ? "video" : "videos"}
                  </span>
                </div>
                <p className="mb-3 mt-1.5 text-[1.02em] text-muted">{level.description}</p>

                <div className="flex flex-wrap gap-2.5">
                  {level.videos.length === 0 ? (
                    <span className="py-2 italic text-muted">
                      No videos yet — edit to add some.
                    </span>
                  ) : (
                    level.videos.map((video) => (
                      <span
                        key={video.id}
                        className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-surface px-3.5 py-2 font-semibold text-[0.96em]"
                      >
                        <PlayIcon size={16} className="text-accent" />
                        {video.title}{" "}
                        <span className="font-medium text-muted">· {video.durationLabel}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-none flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${level.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${level.name} down`}
                  disabled={index === levels.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(level)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(level)}>
                  Remove
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      <LevelDialog
        editing={editing}
        levelCount={levels.length}
        allVideos={allVideos}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function LevelDialog({
  editing,
  levelCount,
  allVideos,
  onClose,
}: {
  editing: Level | "new" | null;
  levelCount: number;
  allVideos: VideoOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = editing === "new";
  const level = isNew ? null : editing;

  const [selected, setSelected] = useState<string[]>(level?.videos.map((v) => v.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset the checkbox selection whenever a different level opens.
  const [key, setKey] = useState<string | null>(null);
  const currentKey = isNew ? "new" : (level?.id ?? null);
  if (currentKey !== key) {
    setKey(currentKey);
    setSelected(level?.videos.map((v) => v.id) ?? []);
    setError(null);
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveLevel({
        id: level?.id,
        name: formData.get("name"),
        description: formData.get("description"),
        videoIds: selected,
      });

      if (!result.ok) {
        setError(result.message ?? "Please check the level details.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog.Root open={editing !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(20,17,14,.55)]" />
        <Dialog.Content className="animate-fadeup fixed left-1/2 top-1/2 z-[81] max-h-[90vh] w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border-2 border-line bg-surface p-8">
          <Dialog.Title className="m-0 mb-1.5 text-[1.6em]">
            {isNew ? "New skill level" : "Edit level"}
          </Dialog.Title>
          <Dialog.Description className="m-0 mb-6 text-muted">
            Name the level, describe what it builds toward, then pick the videos that belong to it.
          </Dialog.Description>

          <form action={submit}>
            <Field label="Level name" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                defaultValue={level?.name ?? `Level ${levelCount} — `}
                placeholder="e.g. Level 1 — Building Support"
              />
            </Field>

            <Field label="Description" htmlFor="description" className="mt-3.5">
              <Textarea
                id="description"
                name="description"
                required
                defaultValue={level?.description ?? ""}
                placeholder="What techniques does this level cover, and how is it more advanced than the one before?"
              />
            </Field>

            <div className="mb-2 mt-5 flex items-baseline justify-between">
              <span className="font-semibold">Videos in this level</span>
              <span className="text-[0.95em] text-muted">{selected.length} selected</span>
            </div>

            <div className="overflow-hidden rounded-[14px] border-2 border-line">
              {allVideos.map((video) => {
                const checked = selected.includes(video.id);
                const takenByAnother =
                  video.levelId !== null && video.levelId !== level?.id && !checked;

                return (
                  <label
                    key={video.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(video.id)
                            ? current.filter((id) => id !== video.id)
                            : [...current, video.id],
                        )
                      }
                      className="h-5 w-5 accent-[var(--accent)]"
                    />
                    <span className="flex-1 font-semibold">{video.title}</span>
                    {takenByAnother ? (
                      <span className="text-[0.85em] text-muted">in another level</span>
                    ) : null}
                    <span className="text-[0.95em] text-muted">{video.durationLabel}</span>
                  </label>
                );
              })}
            </div>

            <p className="mt-2 text-[0.9em] text-muted">
              A video belongs to one level at a time — selecting it here moves it out of any other
              level.
            </p>

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
                {pending ? "Saving…" : "Save level"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
