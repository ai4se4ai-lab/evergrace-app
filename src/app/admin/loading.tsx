/**
 * Loading skeleton for the admin console. Scoped to this segment for the same
 * reason as the dashboard's — see the note in ../dashboard/loading.tsx.
 */
export default function AdminLoading() {
  return (
    <div className="py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the admin console…</span>

      <div className="h-9 w-64 rounded-control bg-line" />
      <div className="mt-4 h-6 w-96 rounded-control bg-line/70" />

      <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-card border-2 border-line bg-surface" />
        ))}
      </div>

      <div className="mt-7 h-[420px] rounded-[18px] border-2 border-line bg-surface" />
    </div>
  );
}
