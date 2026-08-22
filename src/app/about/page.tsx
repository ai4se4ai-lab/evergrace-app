import type { Metadata } from "next";

import { ReadAloudHeading } from "@/components/preferences-provider";
import { Eyebrow } from "@/components/ui/badge";
import { aboutPillars } from "@/content/site";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "About us" };

// Reads content that only ever lives in Postgres, and the Docker build stage
// has no DATABASE_URL (see docs/DEPLOYMENT.md) — force SSR so `next build`
// doesn't try to prerender this page against a database that isn't there.
export const dynamic = "force-dynamic";

const PILLAR_WORD = ["Safe", "Clear", "Kind"];

export default async function AboutPage() {
  const team = await prisma.teamMember.findMany({ orderBy: { order: "asc" } });

  return (
    <main>
      <ReadAloudHeading text="About us" />

      <section className="mx-auto max-w-[900px] px-7 pb-5 pt-16 text-center">
        <Eyebrow>Our mission</Eyebrow>
        <h1 className="m-0 mb-5 mt-5 text-[2.9em] leading-[1.1] tracking-[-0.02em]">
          Martial arts that meet older adults exactly where they are.
        </h1>
        <p className="mx-auto max-w-[56ch] text-[1.3em] text-muted">
          We believe active aging is a right, not a privilege. We take the balance, focus, and
          confidence of traditional martial arts and rebuild them — gentle, safe, and accessible —
          for practicing at home at any ability.
        </p>
      </section>

      <section className="mx-auto max-w-[1100px] px-7 py-10">
        <div className="grid gap-[22px] md:grid-cols-3">
          {aboutPillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="rounded-[18px] border-2 border-line bg-surface p-[30px]"
            >
              <div className="mb-1.5 text-[2.4em] font-bold text-accent">
                {PILLAR_WORD[index] ?? pillar.title}
              </div>
              <p className="m-0 text-[1.1em] text-muted">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-7 pb-[90px] pt-10">
        <h2 className="m-0 mb-1.5 text-center text-[2.1em]">The people behind the practice</h2>
        <p className="mb-[34px] text-center text-[1.2em] text-muted">
          A team of instructors, nurses, designers, and researchers.
        </p>

        <ul role="list" className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <li
              key={member.id}
              className="flex flex-col overflow-hidden rounded-[18px] border-2 border-line bg-surface"
            >
              <div className="placeholder-art flex aspect-[4/5] items-center justify-center">
                <span
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-[1.6em] font-extrabold text-white"
                  aria-hidden
                >
                  {member.initials || member.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="px-[22px] pb-6 pt-5">
                <h3 className="m-0 mb-1 text-[1.3em]">{member.name}</h3>
                <div className="mb-3 text-[1.02em] font-semibold text-accent-dark">
                  {member.role}
                </div>
                <p className="m-0 text-[1.08em] text-muted">{member.bio}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
