import type { Metadata } from "next";

import { LevelBuilder } from "@/components/admin/level-builder";
import { VideoSubTabs } from "@/components/admin/video-sub-tabs";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getLevelsWithVideos } from "@/lib/queries";

export const metadata: Metadata = { title: "Skill levels" };

export default async function AdminLevelsPage() {
  await requireAdmin();
  const { levels, allVideos } = await getLevelsWithVideos();

  return (
    <div>
      <VideoSubTabs levelCount={levels.length} />

      <Card>
        <LevelBuilder levels={levels} allVideos={allVideos} />
      </Card>
    </div>
  );
}
