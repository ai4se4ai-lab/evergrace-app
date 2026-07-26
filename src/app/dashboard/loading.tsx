/**
 * Loading skeleton for the dashboard.
 *
 * Deliberately scoped to this segment rather than the app root: a Suspense
 * boundary above a page commits the HTTP status before the page renders, so a
 * root-level loading.tsx makes `notFound()` return 200 instead of 404. The
 * dashboard is behind auth and never crawled, so a boundary here is safe, while
 * /library/[videoId] and /blog/[slug] keep returning real 404s.
 */
export default function DashboardLoading() {
  return (
    <div className="shell py-11" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>

      <div className="h-10 w-1/3 rounded-control bg-line" />
      <div className="mt-4 h-6 w-2/3 rounded-control bg-line/70" />

      <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-[18px] border-2 border-line bg-surface" />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="h-[380px] rounded-[20px] border-2 border-line bg-surface" />
        <div className="h-[380px] rounded-[20px] border-2 border-line bg-surface" />
      </div>
    </div>
  );
}
