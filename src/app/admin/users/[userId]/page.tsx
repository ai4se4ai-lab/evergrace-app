import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MemberStatusBadge, PlanBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/auth";
import { lastActiveLabel, MOOD_LABEL, TRACK_DESCRIPTION, TRACK_LABEL } from "@/lib/domain";
import { getMemberDetail } from "@/lib/queries";

type Params = { params: Promise<{ userId: string }> };

export const metadata: Metadata = { title: "Member detail" };

/** Human-readable renderings of the raw check-in answers. */
const ANSWER_LABEL: Record<string, Record<string, string>> = {
  mobility: {
    seated: "Seated in a chair",
    supported: "Standing, with support",
    free: "Freely standing",
  },
  surgery: { yes: "Yes — in the last 3 months", no: "No" },
  dizzy: { often: "Often", sometimes: "Sometimes", rarely: "Rarely or never" },
  joints: { significant: "Yes, limits a lot", little: "A little", none: "No" },
};

const QUESTION_LABEL: Record<string, string> = {
  mobility: "Movement preference",
  surgery: "Recent surgery or fall",
  dizzy: "Dizziness or breathlessness",
  joints: "Joint pain",
};

/**
 * Read-only member detail. v1 has no destructive member actions (spec §6.11):
 * staff can see everything needed to support someone, and change nothing.
 */
export default async function AdminMemberDetailPage({ params }: Params) {
  await requireAdmin();

  const { userId } = await params;
  const member = await getMemberDetail(userId);
  if (!member) notFound();

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex min-h-touch items-center gap-2 py-2 font-semibold text-accent-dark"
      >
        ‹ Back to members
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-[1.8em]">{member.name}</h2>
          <p className="m-0 mt-1.5 flex flex-wrap items-center gap-3 text-muted">
            <span>{member.email}</span>
            {member.age !== null ? <span>Age {member.age}</span> : null}
            <PlanBadge plan={member.plan} />
            <MemberStatusBadge status={member.status} />
          </p>
        </div>

        <dl className="flex flex-wrap gap-6">
          <Stat term="Streak" value={`${member.streak}d`} />
          <Stat term="Sessions" value={member.sessions} />
          <Stat term="Avg. progress" value={`${member.averageProgress}%`} />
          <Stat term="Total minutes" value={member.totalMinutes} />
          <Stat term="Lessons" value={member.lessonsComplete} />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="m-0 mb-1 text-[1.4em]">Track &amp; health check-in</h3>
          <p className="m-0 mb-5 text-muted">
            Answered once at sign-up; the track follows from it.
          </p>

          {member.track ? (
            <>
              <span className="inline-block rounded-full bg-accent-soft px-4 py-2 font-semibold text-accent-dark">
                {TRACK_LABEL[member.track]}
              </span>
              <p className="mt-3.5 text-muted">{TRACK_DESCRIPTION[member.track]}</p>
            </>
          ) : (
            <p className="m-0 text-muted">This member hasn’t taken the check-in yet.</p>
          )}

          {member.healthAnswers ? (
            <>
              <dl className="mt-6 grid gap-3">
                {(["mobility", "surgery", "dizzy", "joints"] as const).map((key) => (
                  <div key={key} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                    <dt className="text-muted">{QUESTION_LABEL[key]}</dt>
                    <dd className="m-0 font-semibold">
                      {ANSWER_LABEL[key][member.healthAnswers![key]] ??
                        member.healthAnswers![key]}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="m-0 mt-4 rounded-control border-2 border-[var(--notice-line)] bg-[var(--notice-bg)] px-4 py-3 text-[0.95em] text-[var(--notice-fg)]">
                {site.confidentialityFooter}
              </p>
            </>
          ) : null}
        </Card>

        <Card>
          <h3 className="m-0 mb-1 text-[1.4em]">Activity</h3>
          <p className="m-0 mb-5 text-muted">
            Joined{" "}
            {member.createdAt.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · last active {lastActiveLabel(member.lastActiveAt).toLowerCase()}
          </p>

          {member.progress.length === 0 ? (
            <p className="m-0 text-muted">No sessions started yet.</p>
          ) : (
            <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0">
              {member.progress.slice(0, 8).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line pb-2"
                >
                  <span className="min-w-[180px] flex-1 font-semibold">{row.title}</span>
                  <span className="text-[0.92em] text-muted">{row.categoryName}</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-16 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${row.percent}%` }}
                      />
                    </span>
                    {row.percent}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="m-0 mb-1 text-[1.4em]">Subscriptions</h3>
          <p className="m-0 mb-5 text-muted">What drives their notifications.</p>

          {member.follows.length === 0 ? (
            <p className="m-0 text-muted">Not following anything yet.</p>
          ) : (
            <ul role="list" className="m-0 flex list-none flex-wrap gap-2 p-0">
              {member.follows.map((follow) => (
                <li
                  key={follow.id}
                  className="rounded-full border-2 border-line px-4 py-2 font-semibold"
                >
                  {follow.label}
                </li>
              ))}
            </ul>
          )}

          <h4 className="mb-2 mt-6 text-[1.1em]">Saved videos</h4>
          {member.saved.length === 0 ? (
            <p className="m-0 text-muted">Nothing saved.</p>
          ) : (
            <ul role="list" className="m-0 flex list-none flex-col gap-1.5 p-0">
              {member.saved.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>{row.title}</span>
                  <span className="text-[0.92em] capitalize text-muted">{row.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="m-0 mb-1 text-[1.4em]">Recent mood check-ins</h3>
          <p className="m-0 mb-5 text-muted">Self-reported before practice.</p>

          {member.moods.length === 0 ? (
            <p className="m-0 text-muted">No mood check-ins recorded.</p>
          ) : (
            <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0">
              {member.moods.map((mood) => (
                <li key={mood.id} className="flex flex-wrap gap-3 border-b border-line pb-2">
                  <span className="font-bold text-accent">{mood.score}/5</span>
                  <span className="min-w-[180px] flex-1 text-muted">
                    {MOOD_LABEL[mood.score]}
                  </span>
                  <span className="text-[0.92em] text-muted">
                    {mood.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h4 className="mb-2 mt-6 text-[1.1em]">Recent notifications</h4>
          {member.notifications.length === 0 ? (
            <p className="m-0 text-muted">None sent yet.</p>
          ) : (
            <ul role="list" className="m-0 flex list-none flex-col gap-1.5 p-0">
              {member.notifications.map((row) => (
                <li key={row.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {row.title}{" "}
                    <span className="text-[0.92em] text-muted">— {row.reason}</span>
                  </span>
                  <span className="text-[0.92em] text-muted">{row.read ? "Read" : "Unread"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ term, value }: { term: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[0.82em] uppercase tracking-[0.04em] text-muted">{term}</dt>
      <dd className="m-0 text-[1.6em] font-bold leading-none text-accent">{value}</dd>
    </div>
  );
}
