"use client";

import { usePathname } from "next/navigation";

import { SubTabs } from "@/components/admin/admin-tabs";

export function ContentSubTabs({
  counts,
}: {
  counts: { blog: number; team: number; categories: number; masters: number };
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/admin/content/blog", label: `Blog (${counts.blog})` },
    { href: "/admin/content/team", label: `Team (${counts.team})` },
    { href: "/admin/content/categories", label: `Focus areas (${counts.categories})` },
    { href: "/admin/content/masters", label: `Instructors (${counts.masters})` },
  ];

  return (
    <SubTabs
      tabs={tabs.map((tab) => ({ ...tab, active: pathname.startsWith(tab.href) }))}
    />
  );
}
