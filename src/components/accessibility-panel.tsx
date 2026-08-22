"use client";

import * as Popover from "@radix-ui/react-popover";
import * as Switch from "@radix-ui/react-switch";

import { AccessibilityIcon } from "@/components/icons";
import { usePreferences } from "@/components/preferences-provider";
import { buttonClass } from "@/components/ui/button";
import { TEXT_SIZE_LABEL } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import type { Preferences } from "@/lib/validation";

const TEXT_SIZES: Preferences["textSize"][] = ["16", "20", "24"];

/** The global accessibility panel from spec §7. */
export function AccessibilityPanel() {
  const { preferences, update } = usePreferences();

  return (
    <Popover.Root>
      <Popover.Trigger className={buttonClass("primary", "md")}>
        <AccessibilityIcon />
        Accessibility
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={12}
          className="animate-fadeup z-[60] w-[340px] max-w-[calc(100vw-32px)] rounded-card border-2 border-line bg-surface p-[22px] shadow-modal"
        >
          <div className="mb-4 flex items-center justify-between">
            <strong className="text-[1.2em]">Accessibility</strong>
            <Popover.Close
              aria-label="Close"
              className="min-h-touch rounded-control px-2 text-[1.4em] leading-none text-muted hover:bg-accent-soft"
            >
              ✕
            </Popover.Close>
          </div>

          <fieldset className="mb-[18px] border-0 p-0">
            <legend className="mb-2 font-semibold">Text size</legend>
            <div className="flex gap-2.5">
              {TEXT_SIZES.map((size, index) => {
                const active = preferences.textSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ textSize: size })}
                    className={cn(
                      "min-h-touch flex-1 rounded-control border-2 py-3 font-bold",
                      active
                        ? "border-accent bg-accent-soft text-accent-dark"
                        : "border-line text-fg",
                    )}
                    style={{ fontSize: `${1 + index * 0.25}em` }}
                  >
                    A<span className="sr-only"> — {TEXT_SIZE_LABEL[size]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <ToggleRow
            label="High contrast"
            hint="Maximum legibility"
            checked={preferences.highContrast}
            onChange={(highContrast) => update({ highContrast })}
          />

          <ToggleRow
            label="Read aloud"
            hint="Speak page headings"
            checked={preferences.readAloud}
            onChange={(readAloud) => update({ readAloud })}
          />

          <p className="mt-4 text-[0.9em] text-muted">
            Theme (light, dark, or auto) is in the header, next to this button.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-3.5">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-[0.9em] text-muted">{hint}</span>
      </span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        className={cn(
          "flex h-[34px] w-[62px] flex-none items-center rounded-full p-[3px] transition-colors",
          checked ? "justify-end bg-accent" : "justify-start bg-[#c9bfae]",
        )}
      >
        <Switch.Thumb className="block h-7 w-7 rounded-full bg-white" />
      </Switch.Root>
    </div>
  );
}
