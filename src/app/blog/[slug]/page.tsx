import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReadAloudHeading } from "@/components/preferences-provider";
import { Eyebrow } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  return post ? { title: post.title, description: post.excerpt } : { title: "Post" };
}

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({ select: { slug: true } });
    return posts.map((post) => ({ slug: post.slug }));
  } catch (error) {
    // No DB reachable at build time (e.g. a Docker build stage, or CI without
    // a database) — fall back to on-demand rendering for these routes
    // instead of failing the whole build. See docs/DEPLOYMENT.md.
    console.error("[blog generateStaticParams] DB unreachable at build time:", error);
    return [];
  }
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-[760px] px-7 pb-20 pt-14">
      <ReadAloudHeading text={post.title} />

      <Link
        href="/blog"
        className="mb-6 inline-flex min-h-touch items-center gap-2 py-2 font-semibold text-[1.05em] text-accent-dark"
      >
        ‹ Back to the journal
      </Link>

      <Eyebrow>{post.category}</Eyebrow>
      <h1 className="m-0 mb-3 mt-4 text-[2.4em] leading-tight tracking-[-0.02em]">{post.title}</h1>
      <p className="m-0 mb-8 text-[1.05em] text-muted">
        {post.publishedAt.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}{" "}
        · {post.readMinutes} min read
      </p>

      <div className="placeholder-art mb-9 h-[220px] rounded-[18px] border-2 border-line" />

      <div className="max-w-prose text-[1.15em] leading-relaxed">
        {post.body.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index} className="mb-5">
            {renderInline(paragraph)}
          </p>
        ))}
      </div>
    </main>
  );
}

/**
 * The seeded posts use `**bold**` for lead-ins. Rendering just that one mark
 * keeps the body plain text (no HTML is ever injected).
 */
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return <strong key={index}>{chunk.slice(2, -2)}</strong>;
    }
    return <span key={index}>{chunk}</span>;
  });
}
