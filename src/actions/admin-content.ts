"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/domain";
import {
  blogPostSchema,
  categorySchema,
  masterSchema,
  reorderSchema,
  teamMemberSchema,
} from "@/lib/validation";

import type { AdminResult } from "./admin";

/**
 * Content management for the reference data and marketing tables: categories,
 * masters, blog posts, and team members.
 *
 * Deletes are *refused* rather than cascaded wherever removing a row would
 * silently alter member-facing content — a category with videos in it, or an
 * instructor who is credited on a session. The admin is told what to fix first.
 */

// ---------------------------------------------------------------------------
// Categories (focus areas)
// ---------------------------------------------------------------------------

export async function saveCategory(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, name, blurb } = parsed.data;

  const clash = await prisma.category.findFirst({
    where: { name, ...(id ? { NOT: { id } } : {}) },
  });
  if (clash) return { ok: false, message: `“${name}” already exists.` };

  if (id) {
    await prisma.category.update({ where: { id }, data: { name, blurb: blurb ?? "" } });
  } else {
    await prisma.category.create({ data: { name, blurb: blurb ?? "" } });
  }

  revalidateContent();
  return { ok: true, message: `Saved “${name}”.` };
}

export async function deleteCategory(categoryId: string): Promise<AdminResult> {
  await requireAdmin();

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { videos: true, follows: true } } },
  });
  if (!category) return { ok: false, message: "Unknown focus area." };

  // A category is required on Video, so removing one with videos would orphan
  // them. Refuse and say what to do.
  if (category._count.videos > 0) {
    return {
      ok: false,
      message: `“${category.name}” still has ${category._count.videos} video(s). Move them to another focus area first.`,
    };
  }

  await prisma.category.delete({ where: { id: categoryId } });

  revalidateContent();
  return {
    ok: true,
    message:
      category._count.follows > 0
        ? `Deleted “${category.name}” and ${category._count.follows} follow(s).`
        : `Deleted “${category.name}”.`,
  };
}

// ---------------------------------------------------------------------------
// Masters (instructors)
// ---------------------------------------------------------------------------

export async function saveMaster(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = masterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, name, style } = parsed.data;

  const clash = await prisma.master.findFirst({
    where: { name, ...(id ? { NOT: { id } } : {}) },
  });
  if (clash) return { ok: false, message: `“${name}” already exists.` };

  if (id) {
    await prisma.master.update({ where: { id }, data: { name, style: style || null } });
  } else {
    await prisma.master.create({ data: { name, style: style || null } });
  }

  revalidateContent();
  return { ok: true, message: `Saved “${name}”.` };
}

export async function deleteMaster(masterId: string): Promise<AdminResult> {
  await requireAdmin();

  const master = await prisma.master.findUnique({
    where: { id: masterId },
    include: { _count: { select: { videos: true, follows: true } } },
  });
  if (!master) return { ok: false, message: "Unknown instructor." };

  // `Video.masterId` is optional, so this would succeed — but it would quietly
  // strip the instructor credit from published sessions. Make it deliberate.
  if (master._count.videos > 0) {
    return {
      ok: false,
      message: `${master.name} is credited on ${master._count.videos} video(s). Reassign them first.`,
    };
  }

  await prisma.master.delete({ where: { id: masterId } });

  revalidateContent();
  return {
    ok: true,
    message:
      master._count.follows > 0
        ? `Deleted ${master.name} and ${master._count.follows} follow(s).`
        : `Deleted ${master.name}.`,
  };
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

export async function saveBlogPost(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = blogPostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;

  if (data.id) {
    const existing = await prisma.blogPost.findUnique({ where: { id: data.id } });
    if (!existing) return { ok: false, message: "Unknown post." };

    await prisma.blogPost.update({
      where: { id: data.id },
      data: {
        title: data.title,
        category: data.category,
        excerpt: data.excerpt,
        body: data.body,
        readMinutes: data.readMinutes,
        thumbnailUrl: data.thumbnailUrl || null,
      },
    });

    // The slug is deliberately left alone on edit: it is a public URL, and
    // changing it would break every existing link to the post.
    revalidateBlog(existing.slug);
    return { ok: true, message: `Saved “${data.title}”.` };
  }

  let slug = slugify(data.title);
  if (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  await prisma.blogPost.create({
    data: {
      title: data.title,
      slug,
      category: data.category,
      excerpt: data.excerpt,
      body: data.body,
      readMinutes: data.readMinutes,
      thumbnailUrl: data.thumbnailUrl || null,
    },
  });

  revalidateBlog(slug);
  return { ok: true, message: `Published “${data.title}”.` };
}

export async function deleteBlogPost(postId: string): Promise<AdminResult> {
  await requireAdmin();

  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) return { ok: false, message: "Unknown post." };

  await prisma.blogPost.delete({ where: { id: postId } });

  revalidateBlog(post.slug);
  return { ok: true, message: `Deleted “${post.title}”.` };
}

// ---------------------------------------------------------------------------
// Team members
// ---------------------------------------------------------------------------

export async function saveTeamMember(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, name, role, bio, initials, photoUrl } = parsed.data;

  // Fall back to initials derived from the name, so the placeholder avatar always
  // has something to show.
  const resolvedInitials = (initials?.trim() || autoInitials(name)).toUpperCase();

  if (id) {
    await prisma.teamMember.update({
      where: { id },
      data: { name, role, bio, initials: resolvedInitials, photoUrl: photoUrl || null },
    });
  } else {
    await prisma.teamMember.create({
      data: {
        name,
        role,
        bio,
        initials: resolvedInitials,
        photoUrl: photoUrl || null,
        order: await prisma.teamMember.count(),
      },
    });
  }

  revalidatePath("/admin/content/team");
  revalidatePath("/about");
  return { ok: true, message: `Saved ${name}.` };
}

export async function deleteTeamMember(memberId: string): Promise<AdminResult> {
  await requireAdmin();

  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  if (!member) return { ok: false, message: "Unknown team member." };

  await prisma.teamMember.delete({ where: { id: memberId } });

  const remaining = await prisma.teamMember.findMany({ orderBy: { order: "asc" } });
  await prisma.$transaction(
    remaining.map((row, index) =>
      prisma.teamMember.update({ where: { id: row.id }, data: { order: index } }),
    ),
  );

  revalidatePath("/admin/content/team");
  revalidatePath("/about");
  return { ok: true, message: `Removed ${member.name}.` };
}

export async function reorderTeam(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const { orderedIds } = reorderSchema.parse(input);

  // Atomic, so a reorder can never be half-applied.
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.teamMember.update({ where: { id }, data: { order: index } }),
    ),
  );

  revalidatePath("/admin/content/team");
  revalidatePath("/about");
  return { ok: true };
}

// ---------------------------------------------------------------------------

function autoInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /[a-z]/i.test(part))
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function revalidateContent(): void {
  revalidatePath("/admin/content/categories");
  revalidatePath("/admin/content/masters");
  revalidatePath("/admin/videos");
  revalidatePath("/library");
  revalidatePath("/");
}

function revalidateBlog(slug: string): void {
  revalidatePath("/admin/content/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}
