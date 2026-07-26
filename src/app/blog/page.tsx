import type { Metadata } from "next";
import Link from "next/link";

import { ReadAloudHeading } from "@/components/preferences-provider";
import { Eyebrow } from "@/components/ui/badge";
import { site } from "@/content/site";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: site.journal };

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } });

  return (
    <main className="shell pb-[90px] pt-14">
      <ReadAloudHeading text={`${site.journal}. Stories, tips and gentle guidance.`} />

      <Eyebrow>{site.journal}</Eyebrow>
      <h1 className="m-0 mb-2 mt-4 text-[2.7em] tracking-[-0.02em]">
        Stories, tips &amp; gentle guidance
      </h1>
      <p className="mb-10 max-w-[52ch] text-[1.25em] text-muted">
        Short, practical reads on balance, safety, breathing, and living actively — written for you.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="flex flex-col overflow-hidden rounded-[18px] border-2 border-line bg-surface transition-transform hover:-translate-y-[3px] hover:border-accent"
          >
            <div className="placeholder-art relative h-[150px]">
              <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-[5px] text-[0.85em] font-semibold text-white">
                {post.category}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 px-6 pb-[26px] pt-[22px]">
              <div className="text-[0.95em] text-muted">
                {formatDate(post.publishedAt)} · {post.readMinutes} min read
              </div>
              <h2 className="m-0 text-[1.3em] leading-tight">
                <Link href={`/blog/${post.slug}`} className="text-fg no-underline hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="m-0 text-[1.08em] text-muted">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-auto font-bold text-[1.05em] text-accent-dark"
              >
                Read more →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
