"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setLessonComplete } from "@/actions/member";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import type { VideoDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Syllabus / roadmap accordion (spec §6.7). Checking a lesson writes a
 * LessonCompletion and the chapter's "x of y complete" label recomputes.
 */
export function Syllabus({
  chapters,
  lessonsDone,
  lessonsTotal,
  signedIn,
}: {
  chapters: VideoDetail["chapters"];
  lessonsDone: number;
  lessonsTotal: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pendingLesson, setPendingLesson] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(lessonId: string, complete: boolean) {
    if (!signedIn) {
      router.push("/login?next=/library");
      return;
    }
    setPendingLesson(lessonId);
    startTransition(async () => {
      await setLessonComplete({ lessonId, complete });
      setPendingLesson(null);
      router.refresh();
    });
  }

  return (
    <aside className="sticky top-24 overflow-hidden rounded-[18px] border-2 border-line bg-surface">
      <div className="border-b-2 border-line px-6 py-[22px]">
        <h2 className="m-0 mb-1 text-[1.4em]">Your roadmap</h2>
        <p className="m-0 text-[1.02em] text-muted">
          {lessonsDone} of {lessonsTotal} lessons complete
        </p>
      </div>

      <Accordion.Root type="single" collapsible defaultValue={chapters[0]?.id}>
        {chapters.map((chapter) => (
          <Accordion.Item key={chapter.id} value={chapter.id} className="border-b border-line">
            <Accordion.Header className="m-0">
              <Accordion.Trigger className="group flex w-full items-center gap-3.5 px-6 py-5 text-left hover:bg-accent-soft">
                <span className="flex text-muted transition-transform group-data-[state=open]:rotate-90">
                  <ChevronRightIcon />
                </span>
                <span className="flex-1">
                  <span className="block text-[1.15em] font-bold">{chapter.title}</span>
                  <span className="text-[0.98em] text-muted">{chapter.completeLabel}</span>
                </span>
              </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Content className="px-6 pb-3">
              <ul role="list" className="m-0 flex list-none flex-col p-0">
                {chapter.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => toggle(lesson.id, !lesson.done)}
                      disabled={pendingLesson === lesson.id}
                      aria-pressed={lesson.done}
                      className="flex w-full items-center gap-3.5 rounded-[10px] px-3 py-3.5 text-left text-[1.05em] hover:bg-accent-soft/60"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-7 w-7 flex-none items-center justify-center rounded-full border-2",
                          lesson.done
                            ? "border-success bg-success text-white"
                            : "border-line text-transparent",
                        )}
                      >
                        <CheckIcon size={16} />
                      </span>
                      <span className={cn("flex-1", lesson.done && "text-muted line-through")}>
                        {lesson.title}
                      </span>
                      <span className="text-[0.95em] text-muted">{lesson.durationLabel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>

      {!signedIn ? (
        <p className="m-0 px-6 py-5 text-[0.98em] text-muted">
          Sign in to tick off lessons and keep your progress.
        </p>
      ) : null}
    </aside>
  );
}
