import type { Metadata } from "next";

import { ReadAloudHeading } from "@/components/preferences-provider";
import { TeamCarousel } from "@/components/team-carousel";
import { Eyebrow } from "@/components/ui/badge";
import { aboutPillars } from "@/content/site";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "About us" };

// Reads content that only ever lives in Postgres, and the Docker build stage
// has no DATABASE_URL (see docs/DEPLOYMENT.md) — force SSR so `next build`
// doesn't try to prerender this page against a database that isn't there.
export const dynamic = "force-dynamic";

const PILLAR_WORD = ["Safe", "Clear", "Kind"];

// Placeholders for the COMP 370 students to fill in with their own info —
// not backed by the database, unlike the stakeholders/leadership team below.
const DEVELOPMENT_TEAM_PLACEHOLDERS = 3;

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
        <p className="mb-[50px] text-center text-[1.2em] text-muted">
          A team of instructors, nurses, designers, and researchers.
        </p>

        <h3 className="m-0 mb-1.5 text-center text-[1.5em]">Development Team</h3>
        <p className="mb-7 text-center text-[1.08em] text-muted">
          The COMP 370 students who built this platform.
        </p>
        <ul role="list" className="mb-16 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: DEVELOPMENT_TEAM_PLACEHOLDERS }, (_, i) => (
            <li
              key={i}
              className="flex flex-col overflow-hidden rounded-[18px] border-2 border-line bg-surface"
            >
              <div className="placeholder-art flex aspect-[4/5] items-center justify-center text-[1.02em] font-semibold text-muted">
                Drop your photo
              </div>
              <div className="px-[22px] pb-6 pt-5">
                <h4 className="m-0 mb-1 text-[1.3em]">Your Name</h4>
                <div className="mb-3 text-[1.02em] font-semibold text-accent-dark">
                  Your Role · COMP 370
                </div>
                <p className="m-0 text-[1.08em] text-muted">
                  Add a short line about who you are and what you worked on.
                </p>
              </div>
            </li>
          ))}
        </ul>

        <h3 className="m-0 mb-1.5 text-center text-[1.5em]">Stakeholders &amp; Leadership Team</h3>
        <p className="mb-7 text-center text-[1.08em] text-muted">
          The instructors, clinicians, and faculty guiding the program.
        </p>
        <TeamCarousel members={team} />
      </section>
    </main>
  );
}
