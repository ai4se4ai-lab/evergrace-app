"use client";

import { usePathname } from "next/navigation";

import { SubTabs } from "@/components/admin/admin-tabs";

export function VideoSubTabs({ levelCount }: { levelCount: number }) {
  const pathname = usePathname();
  const onLevels = pathname.startsWith("/admin/videos/levels");

  return (
    <SubTabs
      tabs={[
        { href: "/admin/videos", label: "Catalog", active: !onLevels },
        {
          href: "/admin/videos/levels",
          label: `Skill levels (${levelCount})`,
          active: onLevels,
        },
      ]}
    />
  );
}
