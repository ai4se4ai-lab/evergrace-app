import { z } from "zod";

import {
  ACCESS_LEVELS,
  FOLLOW_KINDS,
  INTENSITIES,
  PLANS,
  SAVED_KINDS,
  STANCES,
  VIDEO_STATUSES,
} from "./domain";

/** Shared between React Hook Form on the client and every server entry point. */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Please enter your email address.")
  .email("That doesn’t look like an email address.");

export const healthCheckInSchema = z.object({
  mobility: z.enum(["seated", "supported", "free"]),
  surgery: z.enum(["yes", "no"]),
  dizzy: z.enum(["often", "sometimes", "rarely"]),
  joints: z.enum(["significant", "little", "none"]),
});

export const signUpSchema = z.object({
  email: emailSchema,
  name: z.string().trim().max(80).optional(),
  age: z.coerce.number().int().min(18).max(120).optional(),
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Passwords are at least 8 characters."),
});

export const moodSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
});

export const followSchema = z.object({
  kind: z.enum(FOLLOW_KINDS),
  targetId: z.string().min(1),
});

export const progressSchema = z.object({
  videoId: z.string().min(1),
  secondsWatched: z.coerce.number().int().min(0).max(60 * 60 * 12),
});

export const savedVideoSchema = z.object({
  videoId: z.string().min(1),
  kind: z.enum(SAVED_KINDS),
});

export const lessonCompletionSchema = z.object({
  lessonId: z.string().min(1),
  complete: z.boolean(),
});

export const planChangeSchema = z.object({
  plan: z.enum(PLANS),
  returnTo: z.string().startsWith("/").optional(),
});

export const preferencesSchema = z.object({
  textSize: z.enum(["16", "20", "24"]).default("16"),
  highContrast: z.boolean().default(false),
  readAloud: z.boolean().default(false),
  theme: z.enum(["light", "dark", "auto"]).default("light"),
});

export type Preferences = z.infer<typeof preferencesSchema>;

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const videoAccessSchema = z.object({
  videoId: z.string().min(1),
  access: z.enum(ACCESS_LEVELS),
});

export const videoStatusSchema = z.object({
  videoId: z.string().min(1),
  status: z.enum(VIDEO_STATUSES),
});

export const videoUploadSchema = z.object({
  title: z.string().trim().min(3, "Give the video a title.").max(120),
  categoryId: z.string().min(1, "Pick a category."),
  masterId: z.string().optional(),
  levelId: z.string().optional(),
  access: z.enum(ACCESS_LEVELS),
  intensity: z.enum(INTENSITIES),
  stance: z.enum(STANCES),
  durationMinutes: z.coerce.number().int().min(1).max(180),
  summary: z.string().trim().max(400).optional(),
  sourceUrl: z.string().trim().url("Enter a full https:// URL.").optional().or(z.literal("")),
  uploadId: z.string().optional(),
  publishImmediately: z.boolean().default(true),
});

export const levelSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Name the level.").max(80),
  description: z.string().trim().min(3, "Describe what this level builds toward.").max(400),
  videoIds: z.array(z.string()).default([]),
});

export const levelReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

/** Editing an existing video. Same shape as upload, minus the upload fields. */
export const videoUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(3, "Give the video a title.").max(120),
  summary: z.string().trim().max(400).optional(),
  categoryId: z.string().min(1, "Pick a category."),
  masterId: z.string().optional(),
  levelId: z.string().optional(),
  access: z.enum(ACCESS_LEVELS),
  status: z.enum(VIDEO_STATUSES),
  intensity: z.enum(INTENSITIES),
  stance: z.enum(STANCES),
  durationMinutes: z.coerce.number().int().min(1).max(180),
  sourceUrl: z.string().trim().url("Enter a full https:// URL.").optional().or(z.literal("")),
});

export const chapterSchema = z.object({
  id: z.string().optional(),
  videoId: z.string().min(1),
  title: z.string().trim().min(3, "Name the chapter.").max(120),
});

export const lessonSchema = z.object({
  id: z.string().optional(),
  chapterId: z.string().min(1),
  title: z.string().trim().min(3, "Name the lesson.").max(120),
  durationMinutes: z.coerce.number().int().min(1).max(180),
});

/**
 * The transcript is edited as one block of `m:ss  text` lines — far quicker for
 * staff than a row-per-line form, and it round-trips losslessly.
 */
export const transcriptSchema = z.object({
  videoId: z.string().min(1),
  text: z.string().max(20_000),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name the focus area.").max(60),
  blurb: z.string().trim().max(200).optional(),
});

export const masterSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name the instructor.").max(80),
  style: z.string().trim().max(120).optional(),
});

export const blogPostSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Give the post a title.").max(160),
  category: z.string().trim().min(2, "Pick a category.").max(60),
  excerpt: z.string().trim().min(10, "Write a one-line excerpt.").max(300),
  body: z.string().trim().min(50, "The post needs a body."),
  readMinutes: z.coerce.number().int().min(1).max(60),
  thumbnailUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const teamMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name the team member.").max(80),
  role: z.string().trim().min(2, "Give their role.").max(120),
  bio: z.string().trim().min(10, "Write a short bio.").max(600),
  initials: z.string().trim().max(3).optional(),
  photoUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const rosterFilterSchema = z.object({
  name: z.string().trim().max(80).optional(),
  track: z.string().optional(),
  plan: z.string().optional(),
  ageMin: z.coerce.number().int().min(0).max(130).optional(),
  ageMax: z.coerce.number().int().min(0).max(130).optional(),
});

export type RosterFilter = z.infer<typeof rosterFilterSchema>;
