"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

const noopSubscribe = () => () => {};

/**
 * True only after hydration.
 *
 * next-themes reads localStorage while initialising, so on the client its first
 * render can report "dark" where the server rendered nothing. Painting the
 * selected state from that would be a hydration mismatch.
 *
 * `useSyncExternalStore` with distinct server and client snapshots is the
 * purpose-built primitive for this: React is told the value legitimately differs
 * across environments, so it resolves it during hydration instead of warning.
 * The older useState-plus-useEffect idiom does the same job by triggering a
 * second render pass, which React 19's `set-state-in-effect` lint rule rightly
 * objects to.
 */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Three-state control rather than a two-state switch, so "follow the system"
 * stays reachable instead of being lost the first time someone taps the toggle.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    // A group of toggle buttons rather than role="radiogroup". A true radiogroup
    // owes the user arrow-key navigation and a roving tabindex; three icon
    // buttons exposing aria-pressed are honest about what they are and are fully
    // keyboard operable via Tab with no custom key handling to get wrong.
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "glass inline-flex items-center gap-0.5 rounded-full p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = hydrated && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={`${label} theme`}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "grid size-7 cursor-pointer place-items-center rounded-full transition-colors duration-300",
              selected
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
