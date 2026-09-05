"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { PlanModalProvider } from "@/components/plan-modal";
import { PreferencesProvider } from "@/components/preferences-provider";
import type { Viewer } from "@/lib/auth";
import type { Plan } from "@/lib/domain";
import type { PlanCatalogEntry } from "@/lib/queries";
import type { Preferences } from "@/lib/validation";

export function AppProviders({
  preferences,
  viewer,
  planCatalog,
  children,
}: {
  preferences: Preferences;
  viewer: Viewer | null;
  planCatalog: Record<Plan, PlanCatalogEntry>;
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
        <PlanModalProvider
          currentPlan={viewer?.plan ?? "BASIC"}
          signedIn={Boolean(viewer)}
          planCatalog={planCatalog}
        >
          {children}
        </PlanModalProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
