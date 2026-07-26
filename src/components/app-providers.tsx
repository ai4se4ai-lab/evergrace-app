"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { PlanModalProvider } from "@/components/plan-modal";
import { PreferencesProvider } from "@/components/preferences-provider";
import type { Viewer } from "@/lib/auth";
import type { Preferences } from "@/lib/validation";

export function AppProviders({
  preferences,
  viewer,
  children,
}: {
  preferences: Preferences;
  viewer: Viewer | null;
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider initial={preferences}>
        <PlanModalProvider currentPlan={viewer?.plan ?? "BASIC"} signedIn={Boolean(viewer)}>
          {children}
        </PlanModalProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
