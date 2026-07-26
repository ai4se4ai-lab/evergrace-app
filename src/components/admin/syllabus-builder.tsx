"use client";

import { useState, useTransition } from "react";

import {
  deleteChapter,
  deleteLesson,
  moveChapter,
  saveChapter,
  saveLesson,
} from "@/actions/admin-video";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PlusIcon } from "@/components/icons";
import { useDataRefresh } from "@/components/admin/use-data-refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { VideoForEdit } from "@/lib/queries";

/**
 * Chapter → Lesson builder for a video's syllabus (the member-facing "roadmap").
 * Inline editing rather than modals: staff typically add several lessons in a
 * row, and a dialog per row would make that tedious.
 */
export function SyllabusBuilder({
  videoId,
  chapters,
}: {
  videoId: string;
  chapters: VideoForEdit["chapters"];
}) {
  const refresh = useDataRefresh();
  const [message, setMessage] = useState<string | null>(null);
  const [newChapter, setNewChapter] = useState("");
  const [, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message ?? null);
      refresh();
    });
  }

  const totalLessons = chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);

  return (
    <div>
      <p className="m-0 mb-5 text-muted">
        {chapters.length} chapter{chapters.length === 1 ? "" : "s"}, {totalLessons} lesson
        {totalLessons === 1 ? "" : "s"}. Members tick lessons off as they go.
      </p>

      {message ? (
        <p
          className="mb-4 rounded-control border-2 border-line bg-bg px-4 py-3 font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <ul role="list" className="m-0 flex list-none flex-col gap-4 p-0">
        {chapters.map((chapter, index) => (
          <li key={chapter.id} className="rounded-card border-2 border-line bg-bg p-5">
            <div className="flex flex-wrap items-center gap-3">
              <ChapterTitle
                chapterId={chapter.id}
                videoId={videoId}
                title={chapter.title}
                onDone={(result) => {
                  setMessage(result.message ?? null);
                  refresh();
                }}
              />
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${chapter.title} up`}
                  disabled={index === 0}
                  onClick={() => run(() => moveChapter(chapter.id, -1))}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Move ${chapter.title} down`}
                  disabled={index === chapters.length - 1}
                  onClick={() => run(() => moveChapter(chapter.id, 1))}
                >
                  ↓
                </Button>
                <ConfirmButton
                  label="Remove"
                  title={`Remove “${chapter.title}”?`}
                  description={`This deletes the chapter and its ${chapter.lessons.length} lesson(s), along with any member completions.`}
                  // revalidatePath alone doesn't update the view we're looking
                  // at — the refresh is what re-runs the Server Component.
                  onConfirm={async () => {
                    const result = await deleteChapter(chapter.id);
                    setMessage(result.message ?? null);
                    if (result.ok) refresh();
                    return result;
                  }}
                />
              </div>
            </div>

            <ul role="list" className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
              {chapter.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-surface px-4 py-3"
                >
                  <span className="flex-1 font-semibold">{lesson.title}</span>
                  <span className="text-[0.95em] text-muted">{lesson.durationMinutes} min</span>
                  {lesson.completions > 0 ? (
                    <span className="text-[0.9em] text-muted">
                      {lesson.completions} completion{lesson.completions === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  <ConfirmButton
                    label="Remove"
                    title={`Remove “${lesson.title}”?`}
                    description={
                      lesson.completions > 0
                        ? `${lesson.completions} member(s) have completed this lesson. Their completion records go too.`
                        : "This removes the lesson from the roadmap."
                    }
                    onConfirm={async () => {
                      const result = await deleteLesson(lesson.id);
                      setMessage(result.message ?? null);
                      if (result.ok) refresh();
                      return result;
                    }}
                  />
                </li>
              ))}
            </ul>

            <AddLesson
              chapterId={chapter.id}
              onDone={(result) => {
                setMessage(result.message ?? null);
                refresh();
              }}
            />
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="new-chapter" className="mb-2 block font-semibold">
            New chapter
          </label>
          <Input
            id="new-chapter"
            value={newChapter}
            onChange={(event) => setNewChapter(event.target.value)}
            placeholder="e.g. Week 4 · Standing Confidence"
          />
        </div>
        <Button
          size="md"
          disabled={newChapter.trim().length < 3}
          onClick={() =>
            run(async () => {
              const result = await saveChapter({ videoId, title: newChapter });
              if (result.ok) setNewChapter("");
              return result;
            })
          }
        >
          <PlusIcon /> Add chapter
        </Button>
      </div>
    </div>
  );
}

function ChapterTitle({
  chapterId,
  videoId,
  title,
  onDone,
}: {
  chapterId: string;
  videoId: string;
  title: string;
  onDone: (result: { ok: boolean; message?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [, startTransition] = useTransition();

  if (!editing) {
    return (
      <>
        <h3 className="m-0 text-[1.2em]">{title}</h3>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Rename
        </Button>
      </>
    );
  }

  return (
    <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`chapter-${chapterId}`}>
        Chapter title
      </label>
      <Input
        id={`chapter-${chapterId}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-w-[200px] flex-1"
      />
      <Button
        size="sm"
        disabled={value.trim().length < 3}
        onClick={() =>
          startTransition(async () => {
            const result = await saveChapter({ id: chapterId, videoId, title: value });
            if (result.ok) setEditing(false);
            onDone(result);
          })
        }
      >
        Save
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setValue(title);
          setEditing(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}

function AddLesson({
  chapterId,
  onDone,
}: {
  chapterId: string;
  onDone: (result: { ok: boolean; message?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("6");
  const [, startTransition] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <label htmlFor={`lesson-${chapterId}`} className="mb-1 block text-[0.92em] font-semibold">
          New lesson
        </label>
        <Input
          id={`lesson-${chapterId}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Gentle weight shifts"
        />
      </div>
      <div className="w-[120px]">
        <label
          htmlFor={`lesson-mins-${chapterId}`}
          className="mb-1 block text-[0.92em] font-semibold"
        >
          Minutes
        </label>
        <Input
          id={`lesson-mins-${chapterId}`}
          type="number"
          min={1}
          max={180}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={title.trim().length < 3}
        onClick={() =>
          startTransition(async () => {
            const result = await saveLesson({
              chapterId,
              title,
              durationMinutes: minutes,
            });
            if (result.ok) setTitle("");
            onDone(result);
          })
        }
      >
        <PlusIcon /> Add
      </Button>
    </div>
  );
}
