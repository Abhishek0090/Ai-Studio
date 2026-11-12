import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Notifies the top bar (and anything else) that the coin balance changed. */
export function announceBalance(balance: number) {
  window.dispatchEvent(new CustomEvent("coins:changed", { detail: balance }));
}

/** Client-side navigation from non-component code (toasts); AppShell routes it. */
export function goTo(path: string) {
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: path }));
}
