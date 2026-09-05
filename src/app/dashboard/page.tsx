import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FocusDonut } from "@/components/charts/focus-donut";
import { PracticeMinutesChart } from "@/components/charts/practice-minutes-chart";
import { FollowChips } from "@/components/follow-chips";
import { PlayIcon } from "@/components/icons";
import { ManagePlanButton } from "@/components/manage-plan-button";
import { MoodSlider } from "@/components/mood-slider";
import { MyLibraryTabs } from "@/components/my-library-tabs";
import { ReadAloudHeading } from "@/components/preferences-provider";
import { PlanBadge } from "@/components/ui/badge";
import { Card, StatCard } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { VideoCard } from "@/components/video-card";
import { getViewer } from "@/lib/auth";
import { TRACK_LABEL } from "@/lib/domain";
import { getDashboardData, getPlanCatalog } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your dashboard" };

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/dashboard");

  const [data, planCatalog] = await Promise.all([getDashboardData(viewer), getPlanCatalog()]);
  const firstName = viewer.name?.split(" ")[0] ?? "there";

  return (
    <main className="shell pb-20 pt-11">
      <ReadAloudHeading text="Your dashboard" />

      <h1 className="m-0 mb-1.5 text-[2.4em]">{greeting()}, {firstName}.</h1>
      <p className="mb-8 text-[1.25em] text-muted">
        Here’s how your practice is going. Take it slow and enjoy it.
      </p>

      {!viewer.track ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-card border-2 border-[var(--notice-line)] bg-[var(--notice-bg)] px-5 py-4">
          <p className="m-0 text-[var(--notice-fg)]">
            You haven’t done the health check-in yet — it’s what matches sessions to your body.
          </p>
          <Link href="/onboarding" className={buttonClass("primary", "md")}>
            Take the check-in
          </Link>
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="mb-6 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current streak" value={data.stats.streak} unit="days" />
        <StatCard label="Minutes this month" value={data.stats.minutesThisMonth} unit="min" />
        <StatCard label="Sessions done" value={data.stats.sessions} unit="total" />
        <StatCard label="Lessons complete" value={data.stats.lessonsComplete} unit="lessons" />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <h2 className="m-0 mb-1 text-[1.4em]">Practice minutes</h2>
          <p className="m-0 mb-[18px] text-[1.05em] text-muted">
            Weekly minutes over the last 8 weeks.
          </p>
          <PracticeMinutesChart data={data.weeklyMinutes} />
        </Card>

        <Card>
          <h2 className="m-0 mb-1 text-[1.4em]">Practice by focus</h2>
          <p className="m-0 mb-3 text-[1.05em] text-muted">Where your time has gone.</p>
          <FocusDonut data={data.focusBreakdown} />
        </Card>
      </div>

      {/* Today's session + mood */}
      <div className="mb-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col overflow-hidden rounded-[20px] border-2 border-line bg-surface">
          {data.suggested ? (
            <>
              <div className="placeholder-art relative flex h-[180px] items-center justify-center">
                <span className="hatch-label">[ session thumbnail ]</span>
                <span className="absolute left-4 top-4 rounded-full bg-accent px-3.5 py-1.5 text-[0.95em] font-semibold text-white">
                  Today’s suggested session
                </span>
              </div>
              <div className="p-[26px]">
                <h2 className="m-0 mb-2 text-[1.5em]">{data.suggested.title}</h2>
                <p className="m-0 mb-[18px] text-[1.05em] text-muted">{data.suggested.metaLine}</p>
                <Link
                  href={`/library/${data.suggested.slug}`}
                  className={cn(buttonClass("primary", "lg"))}
                >
                  <PlayIcon size={22} />
                  {data.suggested.percent > 0 ? "Continue watching" : "Start this session"}
                </Link>
                {viewer.track ? (
                  <p className="m-0 mt-4 text-[0.98em] text-muted">
                    Matched to your {TRACK_LABEL[viewer.track]} track.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="p-[26px]">
              <h2 className="m-0 mb-2 text-[1.5em]">No sessions yet</h2>
              <p className="m-0 text-muted">
                The catalog is empty. Once staff publish a video it appears here.
              </p>
            </div>
          )}
        </div>

        <Card className="flex flex-col">
          <h2 className="m-0 mb-1.5 text-[1.35em]">How is your body feeling today?</h2>
          <p className="m-0 mb-[22px] text-[1.02em] text-muted">Check in before you begin.</p>
          <MoodSlider initial={data.mood} />
        </Card>
      </div>

      {/* Plan + subscriptions */}
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card className="flex flex-col">
          <h2 className="m-0 mb-1.5 text-[1.35em]">Your access level</h2>
          <p className="m-0 mb-4 text-[1.02em] text-muted">Controls which videos you can watch.</p>
          <PlanBadge plan={viewer.plan} className="self-start text-[0.95em]" />
          <p className="mb-5 mt-3.5 text-[1.02em] text-muted">{planCatalog[viewer.plan].unlocks}</p>

          {viewer.plan === "PREMIUM" ? (
            <p className="m-0 mb-4 mt-auto rounded-control bg-success-soft px-4 py-3.5 font-bold text-[1.02em] text-success">
              ✓ You have full access to every video.
            </p>
          ) : null}

          <ManagePlanButton className="mt-auto w-full" />
        </Card>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 mb-1 text-[1.35em]">Your subscriptions</h2>
            <span className="font-semibold text-muted">{data.follows.count} active</span>
          </div>
          <p className="m-0 mb-[18px] text-[1.02em] text-muted">
            Follow what you like — we’ll notify you when new videos are added.
          </p>
          <FollowChips follows={data.follows} plan={viewer.plan} />
        </Card>
      </div>

      {/* New for you */}
      {data.newForYou.length > 0 ? (
        <section className="mb-10">
          <h2 className="m-0 mb-1.5 text-[2em]">New for you</h2>
          <p className="mb-[22px] text-[1.15em] text-muted">
            Fresh videos matched to the skills, masters, and levels you follow.
          </p>
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {data.newForYou.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                variant="compact"
                reason={video.reason}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* My library */}
      <section>
        <h2 className="m-0 mb-1.5 text-[2em]">My Library</h2>
        <p className="mb-[22px] text-[1.15em] text-muted">
          Your subscribed courses and saved videos, all in one place.
        </p>
        <MyLibraryTabs library={data.library} />
      </section>
    </main>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
