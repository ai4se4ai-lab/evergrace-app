"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteBlogPost, saveBlogPost } from "@/actions/admin-content";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PlusIcon } from "@/components/icons";
import { useDataRefresh } from "@/components/admin/use-data-refresh";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  body: string;
  readMinutes: number;
  thumbnailUrl: string | null;
  publishedAt: Date;
};

/** Blog CRUD for The Steady Path Journal. */
export function BlogManager({
  posts,
  categoryNames,
}: {
  posts: PostRow[];
  categoryNames: string[];
}) {
  const refresh = useDataRefresh();
  const [editing, setEditing] = useState<PostRow | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 mb-1 text-[1.4em]">Journal posts</h2>
          <p className="m-0 max-w-[56ch] text-muted">
            Short, practical reads shown at <code>/blog</code>. Use <code>**bold**</code> for
            lead-ins; blank lines separate paragraphs.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusIcon /> New post
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
        {posts.length === 0 ? (
          <li className="text-muted">No posts yet.</li>
        ) : (
          posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-start gap-4 rounded-card border-2 border-line bg-bg px-5 py-4"
            >
              <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="rounded-full bg-accent px-3 py-[3px] text-[0.8em] font-semibold text-white">
                    {post.category}
                  </span>
                  <span className="text-[0.92em] text-muted">
                    {post.publishedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {post.readMinutes} min read
                  </span>
                </div>
                <div className="mt-1.5 text-[1.15em] font-bold">{post.title}</div>
                <p className="m-0 mt-1 text-muted">{post.excerpt}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="min-h-touch px-2 py-2.5 font-bold text-accent-dark underline"
                >
                  View
                </Link>
                <Button variant="outline" size="sm" onClick={() => setEditing(post)}>
                  Edit
                </Button>
                <ConfirmButton
                  label="Delete"
                  title={`Delete “${post.title}”?`}
                  description="The post and its public URL go away immediately. This cannot be undone."
                  onConfirm={async () => {
                    const result = await deleteBlogPost(post.id);
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

      <PostDialog
        editing={editing}
        categoryNames={categoryNames}
        onClose={() => setEditing(null)}
        onSaved={(text) => {
          setMessage(text);
          refresh();
        }}
      />
    </div>
  );
}

function PostDialog({
  editing,
  categoryNames,
  onClose,
  onSaved,
}: {
  editing: PostRow | "new" | null;
  categoryNames: string[];
  onClose: () => void;
  onSaved: (message: string | null) => void;
}) {
  const isNew = editing === "new";
  const post = isNew ? null : editing;

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveBlogPost({
        id: post?.id,
        title: formData.get("title"),
        category: formData.get("category"),
        excerpt: formData.get("excerpt"),
        body: formData.get("body"),
        readMinutes: formData.get("readMinutes"),
        thumbnailUrl: formData.get("thumbnailUrl") || "",
      });

      if (!result.ok) {
        setError(result.message ?? "Please check the post.");
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
        <Dialog.Content className="animate-fadeup fixed left-1/2 top-1/2 z-[81] max-h-[90vh] w-[680px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border-2 border-line bg-surface p-8">
          <Dialog.Title className="m-0 mb-1.5 text-[1.6em]">
            {isNew ? "New post" : "Edit post"}
          </Dialog.Title>
          <Dialog.Description className="m-0 mb-6 text-muted">
            {isNew
              ? "The URL is generated from the title when you publish."
              : `Published at /blog/${post?.slug} — the URL stays fixed so existing links keep working.`}
          </Dialog.Description>

          <form action={submit} key={post?.id ?? "new"}>
            <Field label="Title" htmlFor="title">
              <Input
                id="title"
                name="title"
                required
                defaultValue={post?.title ?? ""}
                placeholder="Three chair exercises to steady your morning"
              />
            </Field>

            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <Input
                  id="category"
                  name="category"
                  required
                  list="blog-categories"
                  defaultValue={post?.category ?? ""}
                  placeholder="Balance"
                />
                <datalist id="blog-categories">
                  {[...categoryNames, "Community", "Wellbeing"].map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </Field>

              <Field label="Read time (minutes)" htmlFor="readMinutes">
                <Input
                  id="readMinutes"
                  name="readMinutes"
                  type="number"
                  min={1}
                  max={60}
                  required
                  defaultValue={post?.readMinutes ?? 4}
                />
              </Field>
            </div>

            <Field label="Excerpt" htmlFor="excerpt" className="mt-4" hint="One line, shown on the index card.">
              <Textarea
                id="excerpt"
                name="excerpt"
                required
                rows={2}
                defaultValue={post?.excerpt ?? ""}
              />
            </Field>

            <Field label="Body" htmlFor="body" className="mt-4">
              <Textarea
                id="body"
                name="body"
                required
                rows={12}
                defaultValue={post?.body ?? ""}
                className="min-h-[260px]"
              />
            </Field>

            <Field label="Thumbnail URL (optional)" htmlFor="thumbnailUrl" className="mt-4">
              <Input
                id="thumbnailUrl"
                name="thumbnailUrl"
                type="url"
                defaultValue={post?.thumbnailUrl ?? ""}
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
                {pending ? "Saving…" : isNew ? "Publish post" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
