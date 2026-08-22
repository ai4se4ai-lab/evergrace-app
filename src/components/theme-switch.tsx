"use client";

import { AutoThemeIcon, MoonIcon, SunIcon } from "@/components/icons";
import { usePreferences } from "@/components/preferences-provider";
import { cn } from "@/lib/utils";
import type { Preferences } from "@/lib/validation";

const OPTIONS: { value: Preferences["theme"]; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "auto", label: "Auto (match system)", Icon: AutoThemeIcon },
];

export function ThemeSwitch() {
  const { preferences, update } = usePreferences();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex gap-1 rounded-xl bg-accent-soft p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preferences.theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            aria-label={label}
            onClick={() => update({ theme: value })}
            className={cn(
              "flex h-10 w-11 items-center justify-center rounded-[9px]",
              active ? "bg-surface text-accent-dark shadow-card" : "text-muted",
            )}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
