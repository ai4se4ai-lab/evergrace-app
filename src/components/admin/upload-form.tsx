"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { createVideo, requestUploadTarget } from "@/actions/admin";
import { UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ACCESS_LABEL,
  ACCESS_LEVELS,
  INTENSITIES,
  INTENSITY_LABEL,
  STANCES,
  STANCE_LABEL,
} from "@/lib/domain";

type Option = { id: string; name: string };

/**
 * Upload flow (spec §6.10).
 *
 * With Mux configured: request a direct-upload URL, PUT the file to Mux from the
 * browser, then create the Video row with status PROCESSING. The asset-ready
 * webhook publishes it.
 *
 * Without Mux: the same form takes a direct source URL instead of a file. The
 * row is still created as PROCESSING and /api/media/webhook publishes it, so the
 * publish → notification path is identical.
 */
export function UploadForm({
  categories,
  masters,
  levels,
  muxConfigured,
}: {
  categories: Option[];
  masters: Option[];
  levels: Option[];
  muxConfigured: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  function submit(formData: FormData) {
    setError(null);
    setStatus(null);

    startTransition(async () => {
      let uploadId: string | undefined;

      // 1. Get an upload target and, in Mux mode, push the file to it.
      if (muxConfigured) {
        const file = fileRef.current?.files?.[0];
        if (!file) {
          setError("Choose a video file to upload.");
          return;
        }

        const target = await requestUploadTarget();
        uploadId = target.uploadId;

        if (target.uploadUrl) {
          setStatus("Uploading to Mux…");
          setProgress(0);
          const response = await fetch(target.uploadUrl, { method: "PUT", body: file });
          setProgress(null);
          if (!response.ok) {
            setError("The upload to Mux failed. Please try again.");
            return;
          }
        }
      }

      // 2. Create the Video row.
      const result = await createVideo({
        title: formData.get("title"),
        categoryId: formData.get("categoryId"),
        masterId: formData.get("masterId") || undefined,
        levelId: formData.get("levelId") || undefined,
        access: formData.get("access"),
        intensity: formData.get("intensity"),
        stance: formData.get("stance"),
        durationMinutes: formData.get("durationMinutes"),
        summary: formData.get("summary") || undefined,
        sourceUrl: formData.get("sourceUrl") || "",
        publishImmediately: formData.get("publishImmediately") === "on",
        uploadId,
      });

      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }

      setStatus(result.message ?? "Created.");
      router.push("/admin/videos");
    });
  }

  return (
    <form action={submit}>
      {muxConfigured ? (
        <div className="mb-5 rounded-[14px] border-2 border-dashed border-line bg-bg p-7 text-center">
          <UploadIcon size={34} className="mx-auto mb-2 text-accent" />
          <label htmlFor="file" className="block cursor-pointer font-semibold">
            Choose a video file
          </label>
          <input
            ref={fileRef}
            id="file"
            name="file"
            type="file"
            accept="video/mp4,video/quicktime"
            className="mx-auto mt-3 block"
          />
          <div className="mt-1 text-[0.95em] text-muted">
            MP4 or MOV · up to 2 GB · sent to Mux for processing
          </div>
          {progress !== null ? (
            <p className="mt-3 font-semibold text-accent-dark">Uploading…</p>
          ) : null}
        </div>
      ) : (
        <div className="mb-5 rounded-[14px] border-2 border-dashed border-line bg-bg p-6">
          <p className="m-0 mb-3 font-semibold">Local mode — no Mux credentials configured</p>
          <p className="m-0 mb-4 text-[0.95em] text-muted">
            File upload needs Mux. For now, paste a direct video URL (or leave it empty and the
            player falls back to the placeholder). See <code>docs/INTEGRATIONS.md</code>.
          </p>
          <Field label="Source URL (optional)" htmlFor="sourceUrl">
            <Input
              id="sourceUrl"
              name="sourceUrl"
              type="url"
              placeholder="https://example.com/session.mp4"
            />
          </Field>
        </div>
      )}

      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required placeholder="e.g. Gentle Evening Stretch" />
      </Field>

      <Field label="Summary (optional)" htmlFor="summary" className="mt-4">
        <Textarea
          id="summary"
          name="summary"
          placeholder="What will a member do in this session, and how will they feel afterwards?"
        />
      </Field>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <Field label="Category" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" required defaultValue={categories[0]?.id ?? ""}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Access level" htmlFor="access">
          <Select id="access" name="access" defaultValue="MEMBERS">
            {ACCESS_LEVELS.map((access) => (
              <option key={access} value={access}>
                {ACCESS_LABEL[access]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Master (optional)" htmlFor="masterId">
          <Select id="masterId" name="masterId" defaultValue="">
            <option value="">No master</option>
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Skill level (optional)" htmlFor="levelId">
          <Select id="levelId" name="levelId" defaultValue="">
            <option value="">No level</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
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
            defaultValue={10}
          />
        </Field>

        <Field label="Intensity" htmlFor="intensity">
          <Select id="intensity" name="intensity" defaultValue="GENTLE">
            {INTENSITIES.map((intensity) => (
              <option key={intensity} value={intensity}>
                {INTENSITY_LABEL[intensity]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Stance" htmlFor="stance">
          <Select id="stance" name="stance" defaultValue="SEATED">
            {STANCES.map((stance) => (
              <option key={stance} value={stance}>
                {STANCE_LABEL[stance]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="mt-5 flex items-center gap-3">
        <input
          type="checkbox"
          name="publishImmediately"
          defaultChecked
          className="h-5 w-5 accent-[var(--accent)]"
        />
        <span className="font-semibold">
          Publish as soon as processing finishes (notifies subscribed members)
        </span>
      </label>

      {error ? (
        <p className="mt-4 font-semibold text-warn" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mt-4 font-semibold text-success" role="status">
          {status}
        </p>
      ) : null}

      <div className="mt-7 flex justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Working…" : "Create video"}
        </Button>
      </div>
    </form>
  );
}
