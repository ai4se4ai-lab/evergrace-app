import Link from "next/link";

import { FeatureCarousel } from "@/components/feature-carousel";
import { ReadAloudHeading } from "@/components/preferences-provider";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/badge";
import { features, site, testimonials } from "@/content/site";
import { prisma } from "@/lib/db";

export default async function LandingPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <main>
      <ReadAloudHeading text="Move with confidence, at your own pace." />

      {/* Hero */}
      <section className="shell grid items-center gap-14 pb-12 pt-[72px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fadeup">
          <Eyebrow>{site.tagline}</Eyebrow>
          <h1 className="mb-5 mt-[22px] text-[3.3em] leading-[1.08] tracking-[-0.02em]">
            Move with confidence, at your own pace.
          </h1>
          <p className="mb-[34px] max-w-[34ch] text-[1.35em] text-muted">
            Balance, breathing, and safe self-defense — taught slowly and clearly, designed for
            older adults practicing at home.
          </p>
          <div className="flex flex-wrap gap-4">
            <ButtonLink href="/onboarding" size="hero">
              Begin — it’s free
            </ButtonLink>
            <ButtonLink href="/library" variant="outline" size="hero">
              Browse videos
            </ButtonLink>
          </div>
          <p className="mt-6 text-[1.05em] text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-accent-dark underline underline-offset-[3px]"
            >
              Log in here
            </Link>{" "}
            — no passwords to remember.
          </p>
        </div>

        <div className="placeholder-art flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[20px] border-2 border-line">
          <span className="hatch-label">[ warm photo — senior practicing ]</span>
        </div>
      </section>

      <FeatureCarousel features={features} />

      {/* Testimonials */}
      <section className="shell pb-10 pt-14">
        <h2 className="mx-auto mb-11 max-w-[20ch] text-center font-display text-[3em] font-extrabold leading-[1.08] tracking-[-0.01em]">
          Members are enjoying happier, steadier lives
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <figure
              key={item.attribution}
              className="m-0 flex flex-col rounded-[20px] border-2 border-line bg-surface px-[30px] py-[34px]"
            >
              <blockquote className="m-0 mb-7 text-[1.5em] leading-[1.4]">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-auto text-[1.02em] font-bold text-accent-dark">
                {item.attribution}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Explore the library */}
      <section className="shell pb-[90px] pt-12">
        <h2 className="mb-6 text-center font-display text-[2.8em] font-extrabold tracking-[-0.01em]">
          Explore our library
        </h2>
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/library"
            className="min-h-[48px] rounded-full border-2 border-accent bg-accent px-[22px] py-3 font-semibold text-[1.05em] text-white"
          >
            All videos
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/library?focus=${encodeURIComponent(category.name)}`}
              className="min-h-[48px] rounded-full border-2 border-line px-[22px] py-3 font-semibold text-[1.05em] hover:bg-accent-soft"
            >
              {category.name}
            </Link>
          ))}
          <Link
            href="/library?focus=Seated"
            className="min-h-[48px] rounded-full border-2 border-line px-[22px] py-3 font-semibold text-[1.05em] hover:bg-accent-soft"
          >
            Seated only
          </Link>
        </div>

        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/library?focus=${encodeURIComponent(category.name)}`}
              className="flex min-h-[220px] flex-col justify-end rounded-[18px] border-2 border-line bg-surface p-6 transition-transform hover:-translate-y-[3px] hover:border-accent"
            >
              <h3 className="m-0 mb-2 text-[1.5em] leading-tight">{category.name}</h3>
              <p className="m-0 text-[1.02em] text-muted">{category.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
