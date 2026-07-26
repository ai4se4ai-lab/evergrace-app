"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Re-fetches the current route's Server Components after a mutation.
 *
 * Why this is a hook rather than a bare `router.refresh()` call: the refresh has
 * to survive the component that triggered it. Calling `router.refresh()` inline
 * from a Server Action callback is unreliable in two ways —
 *
 *   1. the call happens after an `await`, so it lands outside the transition
 *      that React was tracking and can be coalesced away under load; and
 *   2. delete buttons live *inside* the row they remove, so the component
 *      unmounts mid-flight and takes its pending work with it.
 *
 * Bumping a counter and refreshing from an effect makes it deterministic: the
 * state update schedules the effect, and the effect belongs to the list
 * component, which stays mounted. This showed up as lists intermittently
 * keeping a deleted row (or missing a new one) until a manual reload.
 */
export function useDataRefresh(): () => void {
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (tick === 0) return;
    router.refresh();
  }, [tick, router]);

  return useCallback(() => setTick((current) => current + 1), []);
}
