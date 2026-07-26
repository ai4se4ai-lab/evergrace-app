"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { BellIcon, PlayIcon } from "@/components/icons";
import { usePlanModal } from "@/components/plan-modal";
import type { NotificationItem } from "@/lib/queries";
import { relativeTime, type AccessLevel } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Payload = { items: NotificationItem[]; unread: number };

/** Header bell with unread badge, polling /api/notifications (spec §6.8). */
export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const planModal = usePlanModal();

  const { data } = useQuery<Payload>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Could not load notifications");
      return response.json();
    },
    refetchInterval: 60_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok) throw new Error("Could not mark notifications read");
      return response.json() as Promise<Payload>;
    },
    onSuccess: (fresh) => queryClient.setQueryData(["notifications"], fresh),
  });

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  function openNotification(item: NotificationItem) {
    if (item.locked) {
      planModal.open({
        title: item.title,
        access: accessFromLabel(item.accessLabel),
        returnTo: `/library/${item.slug}`,
      });
      return;
    }
    router.push(`/library/${item.slug}`);
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        className="relative flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 border-line text-fg hover:bg-accent-soft"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-surface bg-[#c0442f] px-1.5 text-[0.78em] font-extrabold text-white">
            {unread}
          </span>
        ) : null}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={12}
          className="z-[60] w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-card border-2 border-line bg-surface shadow-modal"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <strong className="text-[1.2em]">Notifications</strong>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="font-bold text-[0.95em] text-accent-dark hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="m-0 px-5 py-8 text-center text-muted">
                Nothing new yet. Follow a skill, master, or level and we’ll tell you when matching
                videos arrive.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left",
                    !item.read && "bg-accent-soft/50",
                  )}
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                    <PlayIcon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-[1.02em]">{item.title}</strong>
                      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.8em] font-bold text-accent-dark">
                        {item.accessLabel}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[0.95em] text-muted">
                      {item.reason} · {relativeTime(new Date(item.createdAt))}
                    </span>
                    {item.locked ? (
                      <span className="mt-1 inline-block font-bold text-[0.9em] text-warn">
                        🔒 Upgrade to watch
                      </span>
                    ) : null}
                  </span>
                  {!item.read ? (
                    <span
                      className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-accent"
                      aria-label="Unread"
                    />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function accessFromLabel(label: string): AccessLevel {
  if (label === "Premium") return "PREMIUM";
  if (label === "Members") return "MEMBERS";
  return "FREE";
}
