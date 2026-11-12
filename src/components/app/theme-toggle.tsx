"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
/** True only after hydration, so the toggle never mismatches the server HTML. */
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={mounted ? `Theme: ${theme}` : "Theme"}
      className={cn(
        "grid size-10 cursor-pointer place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex gap-1 rounded-xl border border-border bg-muted p-1">
      {options.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm transition-colors",
              active ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="size-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
