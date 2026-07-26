import type { Metadata } from "next";

import { CheckInWizard } from "@/components/check-in-wizard";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Health check-in" };

export default async function OnboardingPage() {
  const viewer = await getViewer();

  return (
    <main className="mx-auto max-w-[760px] px-7 pb-20 pt-12">
      <CheckInWizard signedIn={Boolean(viewer)} />
    </main>
  );
}
