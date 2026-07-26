/**
 * Seed data — ported from the prototype's inline arrays (README "Content
 * model"). Running this twice is safe: everything is upserted by a natural key.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MIN = 60;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const categories = [
  { name: "Balance", blurb: "Steady your body and quiet the fear of falling." },
  { name: "Breathing", blurb: "Calming Qigong breath work you can do anywhere." },
  { name: "Joint health", blurb: "Gentle circles that ease stiffness." },
  { name: "Safety", blurb: "Practical skills for falling and getting up safely." },
];

const masters = [
  { name: "Ken Ryu", style: "Tai Chi & Balance" },
  { name: "Aiko Tanaka", style: "Safe Falls & Support" },
  { name: "Mei Lin", style: "Breathing & Mobility" },
];

const levels = [
  {
    order: 0,
    name: "Level 0 — Foundations",
    description:
      "Seated basics: posture, breathing and gentle joint mobility. Everyone starts here.",
  },
  {
    order: 1,
    name: "Level 1 — Building Support",
    description: "Coming to standing with a wall or chair, adding flowing breath work.",
  },
  {
    order: 2,
    name: "Level 2 — Confident Movement",
    description:
      "Free-standing weight shifts and safe-falling technique for greater independence.",
  },
];

type SeedVideo = {
  title: string;
  summary: string;
  category: string;
  master: string;
  level: number | null;
  intensity: "GENTLE" | "MODERATE";
  stance: "SEATED" | "SUPPORTED" | "FREE_STANDING";
  minutes: number;
  access: "FREE" | "MEMBERS" | "PREMIUM";
  status: "DRAFT" | "PROCESSING" | "PUBLISHED";
};

const videos: SeedVideo[] = [
  {
    title: "Seated Balance & Breathing",
    summary:
      "Twelve calm minutes in your chair: sit tall, breathe slowly, and find your centre before you ever stand up.",
    category: "Balance",
    master: "Ken Ryu",
    level: 0,
    intensity: "GENTLE",
    stance: "SEATED",
    minutes: 12,
    access: "FREE",
    status: "PUBLISHED",
  },
  {
    title: "Soft Hands: Gentle Joint Mobility",
    summary:
      "Slow wrist, finger and shoulder circles that ease morning stiffness and keep everyday tasks comfortable.",
    category: "Joint health",
    master: "Mei Lin",
    level: 0,
    intensity: "GENTLE",
    stance: "SEATED",
    minutes: 8,
    access: "FREE",
    status: "PUBLISHED",
  },
  {
    title: "Standing Tall: Wall-Supported Stances",
    summary:
      "Come to standing with a wall or chair close by, and hold three simple stances with confidence.",
    category: "Balance",
    master: "Aiko Tanaka",
    level: 1,
    intensity: "GENTLE",
    stance: "SUPPORTED",
    minutes: 9,
    access: "MEMBERS",
    status: "PUBLISHED",
  },
  {
    title: "Qigong Morning Flow",
    summary:
      "A flowing sequence that links breath to movement — the gentlest possible way to wake the body.",
    category: "Breathing",
    master: "Mei Lin",
    level: 1,
    intensity: "GENTLE",
    stance: "FREE_STANDING",
    minutes: 15,
    access: "MEMBERS",
    status: "PUBLISHED",
  },
  {
    title: "Tai Chi Weight Shifts",
    summary:
      "Free-standing weight transfers drawn from Tai Chi, broken into steps you can practise one at a time.",
    category: "Balance",
    master: "Ken Ryu",
    level: 2,
    intensity: "MODERATE",
    stance: "FREE_STANDING",
    minutes: 14,
    access: "PREMIUM",
    status: "PUBLISHED",
  },
  {
    title: "How to Fall Safely",
    summary:
      "The single most useful skill for preventing serious injury: protecting your head, and getting back up.",
    category: "Safety",
    master: "Aiko Tanaka",
    level: 2,
    intensity: "MODERATE",
    stance: "SUPPORTED",
    minutes: 11,
    access: "PREMIUM",
    status: "PUBLISHED",
  },
  {
    title: "Evening Wind-Down",
    summary: "Slow movement and long exhales to settle the body before rest.",
    category: "Breathing",
    master: "Mei Lin",
    level: null,
    intensity: "GENTLE",
    stance: "SEATED",
    minutes: 10,
    access: "MEMBERS",
    status: "DRAFT",
  },
];

/** The syllabus from the prototype, attached to the flagship free video. */
const syllabus = [
  {
    title: "Week 1 · Foundations of Balance",
    lessons: [
      { title: "Sitting tall & centered", minutes: 6 },
      { title: "Breathing with movement", minutes: 5 },
      { title: "Gentle weight shifts", minutes: 7 },
    ],
  },
  {
    title: "Week 2 · Gentle Strength",
    lessons: [
      { title: "Soft-hand wrist circles", minutes: 5 },
      { title: "Seated leg lifts", minutes: 6 },
      { title: "Supported half-stance", minutes: 8 },
    ],
  },
  {
    title: "Week 3 · Falling Safely",
    lessons: [
      { title: "Protecting your neck", minutes: 7 },
      { title: "Rolling backward slowly", minutes: 9 },
      { title: "Getting up with confidence", minutes: 8 },
    ],
  },
];

const transcript = [
  { at: 12, text: "Sit tall, feet flat on the floor, and breathe in slowly through your nose." },
  { at: 40, text: "Now let the breath out gently, feeling your shoulders soften and drop." },
  { at: 75, text: "We shift our weight to the right, keeping the movement small and controlled." },
  { at: 123, text: "To protect your neck, tuck your chin gently toward your chest." },
  { at: 168, text: "Wonderful. Rest for a moment and notice how steady you feel." },
];

const team = [
  {
    initials: "MT",
    name: "Miranda Ting",
    role: "Lead UX & Accessibility Designer",
    bio: "Designs every screen around older eyes and hands — big targets, calm color, and no dead ends.",
  },
  {
    initials: "KR",
    name: "Ken Ryu",
    role: "Head Martial Arts Instructor",
    bio: "Adapts traditional Jujutsu, Tai Chi, and Qigong into safe, gentle movements anyone can follow.",
  },
  {
    initials: "HM",
    name: "Hannah Mak, RN",
    role: "Health & Safety Lead",
    bio: "Built the health check-in that keeps every session matched to your body and abilities.",
  },
  {
    initials: "MD",
    name: "Dr. Mai Anh Doan",
    role: "Communications & Pedagogy",
    bio: "Writes clear, warm instruction so techniques are easy to understand and repeat at home.",
  },
  {
    initials: "BD",
    name: "Dr. Benny Davidson",
    role: "Community Impact",
    bio: "Measures how the program strengthens balance, confidence, and connection over time.",
  },
  {
    initials: "LH",
    name: "Larissa Horne",
    role: "Experiential Education Coordinator — Centre for Experiential & Career Education",
    bio: "Led the grant application that made this project possible.",
  },
  {
    initials: "MB",
    name: "Dr. Majid Babaei",
    role: "Assistant Professor, School of Computing",
    bio: "Led the development team with students of COMP 370. His work lies at the intersection of software engineering, distributed systems, and intelligent performance analytics.",
  },
];

const posts = [
  {
    category: "Balance",
    readMinutes: 4,
    daysAgo: 23,
    title: "Three chair exercises to steady your morning",
    excerpt:
      "Start the day grounded with gentle seated movements you can do before breakfast.",
    body: `Most falls happen in the first hour after waking, when the body is still stiff and blood pressure is still settling. These three seated movements take about four minutes and ask nothing of your balance until you are ready.

**1. Sit tall.** Move to the front third of the chair, both feet flat, and imagine a thread lifting the crown of your head. Breathe in through the nose for four counts, out for six. Repeat five times.

**2. Ankle pumps and circles.** Lift one heel, keeping the toes down, then lower and lift the toes. Ten each side, then five slow circles each direction. This wakes the small muscles that catch you when you stumble.

**3. Seated weight shifts.** Press gently into your right foot until you feel your weight move, hold for two breaths, then the left. Keep the movement small. Small is the point — you are teaching your body to notice where its weight is, which is the whole foundation of balance.

Do these every morning for two weeks before you add anything standing.`,
  },
  {
    category: "Safety",
    readMinutes: 6,
    daysAgo: 31,
    title: "How to fall safely — and get back up with confidence",
    excerpt:
      "Ken Ryu breaks down the single most useful skill for preventing serious injury.",
    body: `In forty years of teaching I have never met a student who planned to fall. I have met a great many who were glad they had practised it.

**Protect the head first.** Everything else is negotiable. Tuck your chin toward your chest — this single reflex is what martial artists drill for years, and it is the difference between a bruise and a concussion.

**Do not brace with a straight arm.** A locked elbow transmits the whole force of the fall into your wrist and shoulder. Keep the arms soft and let them slap the ground wide, spreading the impact.

**Aim for the fleshy parts.** Roll toward the side and back, so you land on the muscle of the outer thigh and the broad part of the back, not the point of the hip or the tailbone.

**Getting up.** Roll onto your side. Push up to hands and knees. Crawl to a stable chair. Place both hands on the seat, bring one foot forward, and stand with your legs doing the work. Rest, then check yourself over before walking.

We practise all of this from a mat only inches off the floor. Nobody falls from standing in class.`,
  },
  {
    category: "Breathing",
    readMinutes: 3,
    daysAgo: 40,
    title: "The Qigong breath that calms a racing mind",
    excerpt: "A slow breathing pattern from our morning flow, explained step by step.",
    body: `The pattern is simply this: in for four, out for eight. The long exhale is what does the work — it is the part of the breath your nervous system reads as "safe".

Sit or stand comfortably. Let the hands rest at the lower belly. Breathe in through the nose for a count of four, feeling the belly widen rather than the chest lift. Then out through slightly pursed lips for a count of eight, as though cooling a spoonful of soup.

Six rounds is enough to slow the heart noticeably. Ten is enough to change a mood.

If eight counts feels too long, use six. The ratio matters more than the numbers — the out-breath should be about twice the in-breath, and neither should ever feel like a struggle.`,
  },
  {
    category: "Community",
    readMinutes: 5,
    daysAgo: 49,
    title: "Meet Margaret: 90 days on the mat at 74",
    excerpt:
      "One member shares how a daily 10-minute practice changed how steady she feels.",
    body: `Margaret Ellison joined in April, a few months after a fall in her kitchen left her nervous about walking to the mailbox.

"I did not want to be the woman who stopped going out," she says. "But I also was not going to a gym."

She started where everyone starts: the seated track, ten minutes after breakfast. For the first three weeks she did nothing standing at all.

Ninety days later her practice log shows an unbroken streak of 62 days and an average session of eighteen minutes. She has moved to the supported track and does wall stances with a kitchen chair nearby.

"The thing nobody tells you," she says, "is that confidence comes back before strength does. I trusted my feet again long before they were actually stronger. That trust is what got me back outside."`,
  },
  {
    category: "Wellbeing",
    readMinutes: 4,
    daysAgo: 58,
    title: "Why consistency beats intensity as we age",
    excerpt: "The science behind our streak system — and why small, daily movement wins.",
    body: `Balance is not a strength quality. It is a nervous-system skill, and skills respond to frequency far more than to effort.

The practical implication: ten minutes every day beats seventy minutes once a week, by a wide margin. The daily version gives your body seven chances to rehearse the reflexes that catch you. The weekly version gives it one, followed by six days of forgetting.

This is why the dashboard tracks a streak rather than a total. The number we want to move is *how many days*, not *how many minutes*.

It is also why every session in the library is under twenty minutes. A session you will actually do tomorrow is worth more than the ideal session you will skip.`,
  },
  {
    category: "Joint health",
    readMinutes: 5,
    daysAgo: 67,
    title: "Soft hands: keeping wrists and fingers mobile",
    excerpt: "Gentle joint circles that ease stiffness and keep everyday tasks comfortable.",
    body: `Jars, buttons, keys, taps. The tasks that quietly shrink a life are almost all hand tasks.

The good news is that hands respond quickly. Two or three minutes, twice a day, is usually enough to notice a difference inside a fortnight.

**Wrist circles.** Forearms resting on a table, hands loose. Five slow circles each direction. Never force the end of the range.

**Finger spread and fold.** Spread the fingers wide as though pressing into wet sand, hold for two breaths, then fold slowly into a soft fist — thumb outside, never squeezed. Ten repetitions.

**Thumb opposition.** Touch the tip of the thumb to each fingertip in turn, then back. Slowly, with attention. This is the movement grip depends on.

Warm the hands first if they are stiff — under a running tap is fine. Cold joints do not want to move, and there is no reason to argue with them.`,
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding EverGrace…");

  // -- categories / masters / levels ---------------------------------------
  const categoryByName = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { name: c.name },
      update: { blurb: c.blurb },
      create: c,
    });
    categoryByName.set(row.name, row.id);
  }

  const masterByName = new Map<string, string>();
  for (const m of masters) {
    const row = await prisma.master.upsert({
      where: { name: m.name },
      update: { style: m.style },
      create: m,
    });
    masterByName.set(row.name, row.id);
  }

  const levelByOrder = new Map<number, string>();
  for (const l of levels) {
    const existing = await prisma.level.findFirst({ where: { order: l.order } });
    const row = existing
      ? await prisma.level.update({ where: { id: existing.id }, data: l })
      : await prisma.level.create({ data: l });
    levelByOrder.set(l.order, row.id);
  }

  // -- videos ---------------------------------------------------------------
  const videoBySlug = new Map<string, string>();
  for (const [index, v] of videos.entries()) {
    const slug = slugify(v.title);
    const data = {
      title: v.title,
      slug,
      summary: v.summary,
      categoryId: categoryByName.get(v.category)!,
      masterId: masterByName.get(v.master)!,
      levelId: v.level !== null ? levelByOrder.get(v.level)! : null,
      intensity: v.intensity,
      stance: v.stance,
      duration: v.minutes * MIN,
      access: v.access,
      status: v.status,
      createdAt: daysAgo(60 - index * 7),
      publishedAt: v.status === "PUBLISHED" ? daysAgo(60 - index * 7) : null,
    };
    const row = await prisma.video.upsert({ where: { slug }, update: data, create: data });
    videoBySlug.set(slug, row.id);
  }

  // -- syllabus + transcript on the flagship video --------------------------
  const flagshipId = videoBySlug.get(slugify("Seated Balance & Breathing"))!;

  await prisma.chapter.deleteMany({ where: { videoId: flagshipId } });
  for (const [ci, chapter] of syllabus.entries()) {
    await prisma.chapter.create({
      data: {
        videoId: flagshipId,
        title: chapter.title,
        order: ci,
        lessons: {
          create: chapter.lessons.map((lesson, li) => ({
            title: lesson.title,
            duration: lesson.minutes * MIN,
            order: li,
          })),
        },
      },
    });
  }

  await prisma.transcriptLine.deleteMany({ where: { videoId: flagshipId } });
  await prisma.transcriptLine.createMany({
    data: transcript.map((line) => ({
      videoId: flagshipId,
      startSeconds: line.at,
      text: line.text,
    })),
  });

  // -- admin ---------------------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@evergrace.example").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "EverGrace!Admin1";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) },
    create: {
      email: adminEmail,
      name: "EverGrace Staff",
      role: "ADMIN",
      plan: "PREMIUM",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  // -- member roster (the prototype's 12 people) ---------------------------
  const roster = [
    { name: "Margaret Ellison", age: 74, track: "SEATED", plan: "PREMIUM", joinedDaysAgo: 100, lastActiveDaysAgo: 0, progress: 82, sessions: 5 },
    { name: "Harold Weiss", age: 81, track: "SEATED", plan: "MEMBER", joinedDaysAgo: 130, lastActiveDaysAgo: 2, progress: 64, sessions: 4 },
    { name: "Doris Nakamura", age: 69, track: "SUPPORTED", plan: "PREMIUM", joinedDaysAgo: 190, lastActiveDaysAgo: 0, progress: 91, sessions: 6 },
    { name: "Frank Alvarez", age: 77, track: "SUPPORTED", plan: "BASIC", joinedDaysAgo: 70, lastActiveDaysAgo: 8, progress: 22, sessions: 2 },
    { name: "Eleanor Fitzgerald", age: 66, track: "ACTIVE", plan: "MEMBER", joinedDaysAgo: 160, lastActiveDaysAgo: 1, progress: 73, sessions: 5 },
    { name: "George Okafor", age: 84, track: "SEATED", plan: "MEMBER", joinedDaysAgo: 215, lastActiveDaysAgo: 4, progress: 48, sessions: 3 },
    { name: "Betty Chen", age: 71, track: "ACTIVE", plan: "PREMIUM", joinedDaysAgo: 128, lastActiveDaysAgo: 0, progress: 88, sessions: 6 },
    { name: "Raymond Sokolov", age: 79, track: "SUPPORTED", plan: "BASIC", joinedDaysAgo: 40, lastActiveDaysAgo: 15, progress: 12, sessions: 1 },
    { name: "Patricia Lund", age: 68, track: "ACTIVE", plan: "MEMBER", joinedDaysAgo: 158, lastActiveDaysAgo: 3, progress: 57, sessions: 4 },
    { name: "Walter Brennan", age: 88, track: "SEATED", plan: "PREMIUM", joinedDaysAgo: 245, lastActiveDaysAgo: 1, progress: 69, sessions: 6 },
    { name: "Sofia Marchetti", age: 72, track: "SUPPORTED", plan: "MEMBER", joinedDaysAgo: 98, lastActiveDaysAgo: 6, progress: 40, sessions: 3 },
    { name: "James Underwood", age: 65, track: "ACTIVE", plan: "BASIC", joinedDaysAgo: 65, lastActiveDaysAgo: 9, progress: 30, sessions: 2 },
  ] as const;

  const publishedVideoIds = [...videoBySlug.entries()]
    .filter(([slug]) => slug !== slugify("Evening Wind-Down"))
    .map(([, id]) => id);

  for (const person of roster) {
    const email = `${slugify(person.name)}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: person.name,
        age: person.age,
        track: person.track,
        plan: person.plan,
        lastActiveAt: daysAgo(person.lastActiveDaysAgo),
      },
      create: {
        email,
        name: person.name,
        age: person.age,
        role: "MEMBER",
        plan: person.plan,
        track: person.track,
        createdAt: daysAgo(person.joinedDaysAgo),
        lastActiveAt: daysAgo(person.lastActiveDaysAgo),
      },
    });

    // Health check-in consistent with their track.
    const answers =
      person.track === "SEATED"
        ? { mobility: "seated", surgery: "no", dizzy: "sometimes", joints: "little" }
        : person.track === "SUPPORTED"
          ? { mobility: "supported", surgery: "no", dizzy: "rarely", joints: "little" }
          : { mobility: "free", surgery: "no", dizzy: "rarely", joints: "none" };

    await prisma.healthCheckIn.upsert({
      where: { userId: user.id },
      update: { ...answers, computedTrack: person.track },
      create: { userId: user.id, ...answers, computedTrack: person.track },
    });

    // Progress spread across the videos they can see, averaging to `progress`.
    const targets = publishedVideoIds.slice(0, person.sessions);
    for (const [i, videoId] of targets.entries()) {
      const video = await prisma.video.findUnique({ where: { id: videoId } });
      if (!video) continue;
      const percent = Math.max(
        1,
        Math.min(100, person.progress + (i % 2 === 0 ? -6 : 6) * (i > 0 ? 1 : 0)),
      );
      await prisma.progress.upsert({
        where: { userId_videoId: { userId: user.id, videoId } },
        update: { percent, secondsWatched: Math.round((percent / 100) * video.duration) },
        create: {
          userId: user.id,
          videoId,
          percent,
          secondsWatched: Math.round((percent / 100) * video.duration),
        },
      });
    }

    await prisma.moodCheckIn.deleteMany({ where: { userId: user.id } });
    await prisma.moodCheckIn.create({
      data: { userId: user.id, score: person.progress > 60 ? 4 : 3 },
    });
  }

  // -- demo member: Margaret gets follows, saved videos, notifications ------
  const margaret = await prisma.user.findUnique({
    where: { email: `${slugify("Margaret Ellison")}@example.com` },
  });

  if (margaret) {
    const balanceId = categoryByName.get("Balance")!;
    const kenId = masterByName.get("Ken Ryu")!;
    const level0 = levelByOrder.get(0)!;

    await prisma.follow.deleteMany({ where: { userId: margaret.id } });
    await prisma.follow.createMany({
      data: [
        { userId: margaret.id, kind: "CATEGORY", categoryId: balanceId },
        { userId: margaret.id, kind: "MASTER", masterId: kenId },
        { userId: margaret.id, kind: "LEVEL", levelId: level0 },
      ],
    });

    await prisma.savedVideo.deleteMany({ where: { userId: margaret.id } });
    await prisma.savedVideo.createMany({
      data: [
        { userId: margaret.id, videoId: videoBySlug.get(slugify("Seated Balance & Breathing"))!, kind: "subscribed" },
        { userId: margaret.id, videoId: videoBySlug.get(slugify("Standing Tall: Wall-Supported Stances"))!, kind: "subscribed" },
        { userId: margaret.id, videoId: videoBySlug.get(slugify("How to Fall Safely"))!, kind: "subscribed" },
        { userId: margaret.id, videoId: videoBySlug.get(slugify("Qigong Morning Flow"))!, kind: "liked" },
        { userId: margaret.id, videoId: videoBySlug.get(slugify("Tai Chi Weight Shifts"))!, kind: "liked" },
        { userId: margaret.id, videoId: videoBySlug.get(slugify("Soft Hands: Gentle Joint Mobility"))!, kind: "favorite" },
      ],
    });

    await prisma.notification.deleteMany({ where: { userId: margaret.id } });
    await prisma.notification.createMany({
      data: [
        {
          userId: margaret.id,
          videoId: videoBySlug.get(slugify("Tai Chi Weight Shifts"))!,
          reason: "New from Master Ken Ryu",
          createdAt: new Date(Date.now() - 2 * 3600_000),
        },
        {
          userId: margaret.id,
          videoId: videoBySlug.get(slugify("Standing Tall: Wall-Supported Stances"))!,
          reason: "New in Balance",
          createdAt: daysAgo(1),
        },
      ],
    });

    // A completed first chapter, so the syllabus shows real progress.
    const firstChapter = await prisma.chapter.findFirst({
      where: { videoId: flagshipId, order: 0 },
      include: { lessons: { orderBy: { order: "asc" } } },
    });
    if (firstChapter) {
      for (const lesson of firstChapter.lessons.slice(0, 2)) {
        await prisma.lessonCompletion.upsert({
          where: { userId_lessonId: { userId: margaret.id, lessonId: lesson.id } },
          update: {},
          create: { userId: margaret.id, lessonId: lesson.id },
        });
      }
    }
  }

  // -- marketing content ---------------------------------------------------
  for (const [i, member] of team.entries()) {
    const existing = await prisma.teamMember.findFirst({ where: { name: member.name } });
    if (existing) {
      await prisma.teamMember.update({ where: { id: existing.id }, data: { ...member, order: i } });
    } else {
      await prisma.teamMember.create({ data: { ...member, order: i } });
    }
  }

  for (const post of posts) {
    const slug = slugify(post.title);
    const data = {
      title: post.title,
      slug,
      category: post.category,
      excerpt: post.excerpt,
      body: post.body,
      readMinutes: post.readMinutes,
      publishedAt: daysAgo(post.daysAgo),
    };
    await prisma.blogPost.upsert({ where: { slug }, update: data, create: data });
  }

  console.log(`Done.
  Admin login:  ${adminEmail} / ${adminPassword}
  Demo member:  margaret-ellison@example.com  (sign in from /login — the magic
                link is printed to this console in local mode)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
