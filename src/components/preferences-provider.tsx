"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { savePreferences } from "@/actions/preferences";
import type { Preferences } from "@/lib/validation";

type PreferencesContextValue = {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  /** Speaks a heading when read-aloud is on (spec §7). */
  announce: (text: string) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}

export function PreferencesProvider({
  initial,
  children,
}: {
  initial: Preferences;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(initial);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reflect preferences onto <html>. The server already set these attributes on
  // first paint; this keeps them in sync as the panel is used.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themePref = preferences.theme;
    root.dataset.contrast = preferences.highContrast ? "high" : "normal";
    root.dataset.textSize = preferences.textSize;

    if (preferences.theme === "auto") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        root.dataset.theme = media.matches ? "dark" : "light";
      };
      apply();
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }

    root.dataset.theme = preferences.theme;
    return undefined;
  }, [preferences]);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };

      // Debounced so dragging through text sizes doesn't fire three writes.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void savePreferences(next);
      }, 400);

      return next;
    });
  }, []);

  const announce = useCallback(
    (text: string) => {
      if (!preferences.readAloud || typeof window === "undefined") return;
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        // Speech synthesis is unavailable — silently skip.
      }
    },
    [preferences.readAloud],
  );

  const value = useMemo(
    () => ({ preferences, update, announce }),
    [preferences, update, announce],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

/**
 * Drop into any page to have its <h1> spoken on navigation when read-aloud is
 * enabled. Renders nothing.
 */
export function ReadAloudHeading({ text }: { text: string }) {
  const { announce } = usePreferences();

  useEffect(() => {
    announce(text);
  }, [announce, text]);

  return null;
}
