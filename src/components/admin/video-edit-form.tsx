"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteVideo, updateVideo } from "@/actions/admin-video";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ACCESS_LABEL,
  ACCESS_LEVELS,
  INTENSITIES,
  INTENSITY_LABEL,
  STANCES,
  STANCE_LABEL,
  STATUS_LABEL,
  VIDEO_STATUSES,
} from "@/lib/domain";
import type { VideoForEdit } from "@/lib/queries";

type Option = { id: string; name: string };

export function VideoEditForm({
  video,
  categories,
  masters,
  levels,
}: {
  video: VideoForEdit;
  categories: Option[];
  masters: Option[];
  levels: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateVideo({
        id: video.id,
        title: formData.get("title"),
        summary: formData.get("summary") || undefined,
        categoryId: formData.get("categoryId"),
        masterId: formData.get("masterId") || undefined,
        levelId: formData.get("levelId") || undefined,
        access: formData.get("access"),
        status: formData.get("status"),
        intensity: formData.get("intensity"),
        stance: formData.get("stance"),
        durationMinutes: formData.get("durationMinutes"),
        sourceUrl: formData.get("sourceUrl") || "",
      });

      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setMessage(result.message ?? "Saved.");
      router.refresh();
    });
  }

  return (
    <form action={submit}>
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required defaultValue={video.title} />
      </Field>

      <Field label="Summary" htmlFor="summary" className="mt-4">
        <Textarea id="summary" name="summary" defaultValue={video.summary} />
      </Field>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <Field label="Focus area" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" required defaultValue={video.categoryId}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Access level" htmlFor="access">
          <Select id="access" name="access" defaultValue={video.access}>
            {ACCESS_LEVELS.map((access) => (
              <option key={access} value={access}>
                {ACCESS_LABEL[access]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Status"
          htmlFor="status"
          hint="Moving to Published notifies subscribed members."
        >
          <Select id="status" name="status" defaultValue={video.status}>
            {VIDEO_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Duration (minutes)" htmlFor="durationMinutes">
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={180}
            required
            defaultValue={video.durationMinutes}
          />
        </Field>

        <Field label="Master (optional)" htmlFor="masterId">
          <Select id="masterId" name="masterId" defaultValue={video.masterId ?? ""}>
            <option value="">No master</option>
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Skill level (optional)" htmlFor="levelId">
          <Select id="levelId" name="levelId" defaultValue={video.levelId ?? ""}>
            <option value="">No level</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Intensity" htmlFor="intensity">
          <Select id="intensity" name="intensity" defaultValue={video.intensity}>
            {INTENSITIES.map((intensity) => (
              <option key={intensity} value={intensity}>
                {INTENSITY_LABEL[intensity]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Stance" htmlFor="stance">
          <Select id="stance" name="stance" defaultValue={video.stance}>
            {STANCES.map((stance) => (
              <option key={stance} value={stance}>
                {STANCE_LABEL[stance]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Source URL"
        htmlFor="sourceUrl"
        className="mt-4"
        hint={
          video.muxPlaybackId
            ? `Mux playback id ${video.muxPlaybackId} takes precedence.`
            : "Leave empty to keep the placeholder player."
        }
      >
        <Input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          defaultValue={video.sourceUrl ?? ""}
          placeholder="https://example.com/session.mp4"
        />
      </Field>

      {error ? (
        <p className="mt-4 font-semibold text-warn" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 font-semibold text-success" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <ConfirmButton
          label="Delete video"
          title={`Delete “${video.title}”?`}
          description={
            video.counts.progress > 0
              ? `This also removes ${video.counts.progress} member progress record(s), ${video.counts.savedBy} saved entry(ies), and its notifications. This cannot be undone.`
              : "This removes the video, its syllabus, and its transcript. This cannot be undone."
          }
          onConfirm={async () => {
            const result = await deleteVideo(video.id);
            if (result.ok) router.push("/admin/videos");
            return result;
          }}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
